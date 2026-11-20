package com.resumebuilder.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.MatchDtos.Matched;
import com.resumebuilder.ai.MatchDtos.MatchRequest;
import com.resumebuilder.ai.MatchDtos.MatchResponse;
import com.resumebuilder.ai.MatchDtos.Missing;
import com.resumebuilder.ai.MatchDtos.ModelMatch;
import com.resumebuilder.ai.MatchDtos.Suggestion;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;

/**
 * Job Match: one analysis of a CV against a job description (PRD JM-07), shared by the Job match page, the
 * ATS keyword check and Tailored Resume. The model's answer is checked before it is shown (JM-08): a matching
 * skill needs a quote that is really in the CV, a missing skill needs a quote that is really in the job
 * description and must not already be in the CV. Free for now; a daily cap can be set with
 * `app.ai.max-matches-per-day` (0 means none).
 */
@Service
public class MatchService {

    private static final Logger log = LoggerFactory.getLogger(MatchService.class);

    private static final int MAX_CV_CHARS = 80_000;
    static final int MAX_SUGGESTIONS = 6;
    static final int MAX_SKILLS = 30;

    private final MatchAnalyzer analyzer;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter = new AiRateLimiter(6);
    private final int maxPerDay;

    MatchService(MatchAnalyzer analyzer, AiUsageRepository usage, @Value("${app.ai.max-matches-per-day:0}") int maxPerDay) {
        this.analyzer = analyzer;
        this.usage = usage;
        this.maxPerDay = maxPerDay;
    }

    public MatchResponse match(UUID userId, MatchRequest request) {
        JsonNode cv = request.cv();
        if (cv == null || !cv.isObject() || cv.toString().length() > MAX_CV_CHARS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "This CV is too large to analyse.");
        }
        String jd = request.jobDescription() == null ? "" : request.jobDescription().strip();
        if (jd.length() < 20) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please paste the job description (at least a few lines).");
        }
        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!analyzer.demo() && maxPerDay > 0
                && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1)), List.of("job_match", "job_match_failed")) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for job matches. Please try again tomorrow.");
        }

        MatchAnalyzer.Result result;
        try {
            result = analyzer.analyze(cv, jd, "bn".equals(request.language()) ? "bn" : "en");
        } catch (ModelException e) {
            usage.record(userId, "job_match_failed", analyzer.modelName(), analyzer.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "job_match", analyzer.modelName(), analyzer.demo(), result.usage());

        MatchResponse checked = checked(result.match(), cv, jd, analyzer.demo());
        log.info("Job match: {} matching, {} missing, band {} (model {}).", checked.matching().size(), checked.missing().size(),
                checked.band(), analyzer.modelName());
        return checked;
    }

    // --- checking the model's answer ----------------------------------------------------------

    /** Keeps only skills backed by a real quote, and sizes everything. */
    static MatchResponse checked(ModelMatch m, JsonNode cv, String jd, boolean demo) {
        String cvText = squash(ChatGuard.corpus(List.of(), cv));
        String jdText = squash(jd);

        List<Matched> matching = new ArrayList<>();
        for (Matched x : orEmpty(m.matching())) {
            String skill = ChatGuard.clean(x.skill(), 80);
            String evidence = ChatGuard.clean(x.evidence(), 160);
            if (skill.isEmpty() || evidence.length() < 2 || !cvText.contains(squash(evidence))) continue;
            if (matching.stream().anyMatch(o -> o.skill().equalsIgnoreCase(skill))) continue;
            matching.add(new Matched(skill, evidence));
            if (matching.size() >= MAX_SKILLS) break;
        }

        List<Missing> missing = new ArrayList<>();
        for (Missing x : orEmpty(m.missing())) {
            String skill = ChatGuard.clean(x.skill(), 80);
            String quote = ChatGuard.clean(x.jdQuote(), 160);
            if (skill.isEmpty() || quote.length() < 2 || !jdText.contains(squash(quote))) continue;
            // The CV already shows it (the model's own list, or the skill's name appears in the CV): not missing.
            if (matching.stream().anyMatch(o -> o.skill().equalsIgnoreCase(skill))) continue;
            if (cvText.contains(squash(skill))) continue;
            if (missing.stream().anyMatch(o -> o.skill().equalsIgnoreCase(skill))) continue;
            String importance = "nice".equals(x.importance()) ? "nice" : "required"; // equals() is null-safe here
            missing.add(new Missing(skill, importance, quote));
            if (missing.size() >= MAX_SKILLS) break;
        }

        List<Suggestion> suggestions = new ArrayList<>();
        for (Suggestion s : orEmpty(m.suggestions())) {
            String text = ChatGuard.clean(s.text(), 500);
            if (text.isEmpty()) continue;
            String entry = ChatGuard.clean(s.entry(), 60);
            if (!entry.isEmpty() && !hasEntry(cv, entry)) entry = "";
            suggestions.add(new Suggestion(text, entry));
            if (suggestions.size() >= MAX_SUGGESTIONS) break;
        }

        String band = m.band() != null && MatchPrompts.BANDS.contains(m.band()) ? m.band() : "partial";
        if (matching.isEmpty()) band = "low"; // nothing the CV can be shown to have: never better than low
        return new MatchResponse(band, ChatGuard.clean(m.summary(), 800), ChatGuard.clean(m.jobTitle(), 120),
                ChatGuard.clean(m.company(), 120), matching, missing, suggestions, demo);
    }

    private static boolean hasEntry(JsonNode cv, String ref) {
        for (JsonNode section : cv.path("sections")) {
            for (JsonNode entry : section.path("entries")) {
                if (ref.equals(entry.path("ref").asString(""))) return true;
            }
        }
        return false;
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return list == null ? List.of() : list.stream().filter(java.util.Objects::nonNull).toList();
    }

    /** Case, spacing, bullets and punctuation at the edges must not make the same text look different. */
    static String squash(String s) {
        return ChatGuard.asciiDigits(s).replaceAll("[\\s\\u2022*\\u2013\\u2014\\-]+", " ").strip().toLowerCase();
    }
}
