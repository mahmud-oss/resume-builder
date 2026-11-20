package com.resumebuilder.ai;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.ai.AtsDtos.AtsFileResponse;
import com.resumebuilder.ai.AtsDtos.FileReport;
import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.CvExtractor.Result;
import com.resumebuilder.ai.CvExtractor.Source;
import com.resumebuilder.common.ApiException;

/**
 * The ATS checker for an uploaded file: checks how the file itself will read (no AI), and has the model read
 * the CV once so the page can run its content rules on it. The file is handled in memory and never stored.
 * Free for now; a daily cap can be set with `app.ai.max-ats-files-per-day` (0 means none).
 */
@Service
public class AtsService {

    private static final Logger log = LoggerFactory.getLogger(AtsService.class);

    private final CvExtractor extractor;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter = new AiRateLimiter(6);
    private final int maxPerDay;

    AtsService(CvExtractor extractor, AiUsageRepository usage,
               @Value("${app.ai.max-ats-files-per-day:0}") int maxPerDay) {
        this.extractor = extractor;
        this.usage = usage;
        this.maxPerDay = maxPerDay;
    }

    public AtsFileResponse checkFile(UUID userId, String fileName, byte[] bytes) {
        Source source = UploadService.prepare(bytes, fileName);

        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!extractor.demo() && maxPerDay > 0
                && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1)), List.of("ats_file", "ats_file_failed")) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for checking files. Please try again tomorrow.");
        }

        FileReport report;
        try {
            report = source.pdf() != null ? FileChecks.pdf(bytes) : FileChecks.docx(bytes, source.text());
        } catch (IOException | RuntimeException e) {
            log.warn("ATS file checks failed: {}", e.getClass().getSimpleName());
            throw new ApiException(HttpStatus.BAD_REQUEST, "We could not open that file. It may be damaged.");
        }

        Result result;
        try {
            result = extractor.extract(source);
        } catch (ModelException e) {
            usage.record(userId, "ats_file_failed", extractor.modelName(), extractor.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "ats_file", extractor.modelName(), extractor.demo(), result.usage());
        log.info("ATS file checked ({}, {} bytes, {} findings, model {}).", report.meta().kind(), bytes.length,
                report.findings().size(), extractor.modelName());
        return new AtsFileResponse(UploadService.tidy(result.cv()), report.meta(), report.findings(), extractor.demo());
    }
}
