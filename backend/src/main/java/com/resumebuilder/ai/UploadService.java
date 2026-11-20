package com.resumebuilder.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.CvExtractor.Result;
import com.resumebuilder.ai.CvExtractor.Source;
import com.resumebuilder.ai.UploadDtos.Basics;
import com.resumebuilder.ai.UploadDtos.Entry;
import com.resumebuilder.ai.UploadDtos.ExtractedSection;
import com.resumebuilder.ai.UploadDtos.Extraction;
import com.resumebuilder.ai.UploadDtos.FieldValue;
import com.resumebuilder.ai.UploadDtos.UploadResponse;
import com.resumebuilder.common.ApiException;

/**
 * CV upload: checks the file, has the model read it, and returns the fields. The file is handled in memory and
 * never stored, and nothing from it is logged. Free for now, but every call is recorded in `ai_usage` and the
 * model call is the one place a charge ("only when the conversion succeeds") can be added later.
 */
@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    static final int MAX_BYTES = 4 * 1024 * 1024;
    static final int MAX_PAGES = 4;
    /** About four pages of text. */
    static final int MAX_DOCX_CHARS = 16_000;

    private static final int MAX_SECTIONS = 20;
    private static final int MAX_ENTRIES = 40;
    private static final int MAX_FIELDS = 20;
    private static final int MAX_VALUE = 4000;
    private static final int MAX_NOTES = 8;

    private final CvExtractor extractor;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter = new AiRateLimiter(6);
    private final int maxPerDay;

    UploadService(CvExtractor extractor, AiUsageRepository usage,
                  @Value("${app.ai.max-uploads-per-day:0}") int maxPerDay) {
        this.extractor = extractor;
        this.usage = usage;
        this.maxPerDay = maxPerDay;
    }

    public UploadResponse convert(UUID userId, String fileName, byte[] bytes) {
        Source source = prepare(bytes, fileName);

        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!extractor.demo() && maxPerDay > 0
                && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1)), List.of("upload", "upload_failed")) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for CV uploads. Please try again tomorrow.");
        }

        Result result;
        try {
            result = extractor.extract(source);
        } catch (ModelException e) {
            // A failed conversion is recorded (it still counts toward the daily limit) but, once there are
            // credits, it must cost the user nothing.
            usage.record(userId, "upload_failed", extractor.modelName(), extractor.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "upload", extractor.modelName(), extractor.demo(), result.usage());
        log.info("CV upload converted ({}, {} bytes, model {}).", source.pdf() != null ? "pdf" : "docx", bytes.length, extractor.modelName());
        return new UploadResponse(tidy(result.cv()), extractor.demo());
    }

    // --- checking the file --------------------------------------------------------------------

    /** Checks an upload (size, real type, pages, text) and says how it will be read. Shared with the ATS checker. */
    static Source prepare(byte[] bytes, String fileName) {
        if (bytes == null || bytes.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That file is empty.");
        }
        if (bytes.length > MAX_BYTES) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "That file is too large. The limit is 4 MB.");
        }
        // The file's own bytes decide what it is, not its name or what the browser says.
        Source source = isPdf(bytes) ? pdfSource(bytes, fileName) : isZip(bytes) ? docxSource(bytes, fileName) : null;
        if (source == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please upload a PDF or Word (.docx) file.");
        }
        return source;
    }

    static boolean isPdf(byte[] b) {
        return b.length > 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-';
    }

    static boolean isZip(byte[] b) {
        return b.length > 4 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4;
    }

    private static Source pdfSource(byte[] bytes, String fileName) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            if (doc.isEncrypted()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "That PDF is password-protected. Please remove the password and try again.");
            }
            if (doc.getNumberOfPages() > MAX_PAGES) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "That PDF has more than " + MAX_PAGES + " pages. Please upload a shorter CV.");
            }
            if (doc.getNumberOfPages() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "That PDF has no pages.");
            }
        } catch (java.io.IOException | RuntimeException e) {
            if (e instanceof ApiException api) throw api;
            throw new ApiException(HttpStatus.BAD_REQUEST, "We could not open that PDF. It may be damaged.");
        }
        return Source.ofPdf(bytes, fileName);
    }

    private static Source docxSource(byte[] bytes, String fileName) {
        String text;
        try {
            text = DocxText.extract(bytes);
        } catch (DocxText.NotDocxException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please upload a PDF or Word (.docx) file.");
        }
        if (text.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "We found no text in that document.");
        }
        if (text.length() > MAX_DOCX_CHARS) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "That document is longer than about " + MAX_PAGES + " pages. Please upload a shorter CV.");
        }
        return Source.ofText(text, fileName);
    }

    // --- tidying the model's answer -----------------------------------------------------------

    /** Makes the answer safe to send on: no nulls, bounded sizes. Meaning is not changed. */
    static Extraction tidy(Extraction in) {
        Basics b = in.basics() == null ? new Basics("", "", "", "", "", "", "") : new Basics(
                clip(in.basics().fullName()), clip(in.basics().headline()), clip(in.basics().email()),
                clip(in.basics().phone()), clip(in.basics().location()), clip(in.basics().website()),
                clip(in.basics().linkedin()));
        List<ExtractedSection> sections = new ArrayList<>();
        for (ExtractedSection s : orEmpty(in.sections())) {
            if (sections.size() >= MAX_SECTIONS) break;
            List<Entry> entries = new ArrayList<>();
            for (Entry e : orEmpty(s.entries())) {
                if (entries.size() >= MAX_ENTRIES) break;
                List<FieldValue> fields = new ArrayList<>();
                for (FieldValue f : orEmpty(e.fields())) {
                    if (fields.size() >= MAX_FIELDS) break;
                    if (f.field() == null || clip(f.value()).isBlank()) continue;
                    fields.add(new FieldValue(f.field().strip(), clip(f.value())));
                }
                if (!fields.isEmpty()) entries.add(new Entry(fields));
            }
            if (!entries.isEmpty()) sections.add(new ExtractedSection(s.type() == null ? "custom" : s.type(), clip(s.title()), entries));
        }
        List<String> notes = orEmpty(in.reviewNotes()).stream()
                .map(UploadService::clip).filter(n -> !n.isBlank()).limit(MAX_NOTES).toList();
        return new Extraction(b, sections, clip(in.other()), notes);
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list.stream().filter(java.util.Objects::nonNull).toList();
    }

    private static String clip(String s) {
        if (s == null) return "";
        String t = s.strip();
        return t.length() > MAX_VALUE ? t.substring(0, MAX_VALUE) : t;
    }
}
