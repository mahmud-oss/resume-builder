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
import com.resumebuilder.ai.ReviewDtos.ReviewItem;
import com.resumebuilder.ai.ReviewDtos.ReviewResponse;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;

/**
 * The ATS checker's "review my writing". The model's feedback is checked before it is shown: the text it
 * comments on must really be in the CV, and its rewrite may not contain a number that is not already there.
 * Free for now; a daily cap can be set with `app.ai.max-reviews-per-day` (0 means none).
 */
@Service
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private static final int MAX_CV_CHARS = 80_000;
    static final int MAX_ITEMS = 8;

    private final WritingReviewer reviewer;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter = new AiRateLimiter(6);
    private final int maxPerDay;

    ReviewService(WritingReviewer reviewer, AiUsageRepository usage,
                  @Value("${app.ai.max-reviews-per-day:0}") int maxPerDay) {
        this.reviewer = reviewer;
        this.usage = usage;
        this.maxPerDay = maxPerDay;
    }

    public ReviewResponse review(UUID userId, JsonNode cv) {
        if (cv == null || !cv.isObject() || cv.toString().length() > MAX_CV_CHARS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "This CV is too large to review.");
        }
        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!reviewer.demo() && maxPerDay > 0
                && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1)), List.of("writing_review", "writing_review_failed")) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for writing reviews. Please try again tomorrow.");
        }

        WritingReviewer.Result result;
        try {
            result = reviewer.review(cv);
        } catch (ModelException e) {
            usage.record(userId, "writing_review_failed", reviewer.modelName(), reviewer.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "writing_review", reviewer.modelName(), reviewer.demo(), result.usage());

        List<ReviewItem> kept = checked(result.review().items(), cv);
        log.info("Writing review: {} of {} items kept (model {}).",
                kept.size(), result.review().items() == null ? 0 : result.review().items().size(), reviewer.modelName());
        return new ReviewResponse(ChatGuard.clean(result.review().summary(), 600), kept, reviewer.demo());
    }

    // --- checking the model's answer ----------------------------------------------------------

    /** Keeps only feedback about text that is really in the CV, with a rewrite that adds no new numbers. */
    static List<ReviewItem> checked(List<ReviewItem> items, JsonNode cv) {
        List<ReviewItem> out = new ArrayList<>();
        if (items == null) return out;
        String corpus = ChatGuard.corpus(List.of(), cv);
        for (ReviewItem item : items) {
            if (item == null || out.size() >= MAX_ITEMS) continue;
            String entry = ChatGuard.clean(item.entry(), 60);
            String field = ChatGuard.clean(item.field(), 60);
            String original = ChatGuard.clean(item.original(), 1500);
            String issue = ChatGuard.clean(item.issue(), 300);
            String suggestion = ChatGuard.plainLines(ChatGuard.clean(item.suggestion(), 1500));
            if (entry.isEmpty() || field.isEmpty() || original.isEmpty() || issue.isEmpty() || suggestion.isEmpty()) continue;
            if (suggestion.equalsIgnoreCase(original)) continue;
            String actual = valueOf(cv, entry, field);
            if (actual == null || !squash(actual).contains(squash(original))) continue;
            if (!ChatGuard.numbersNotIn(suggestion, corpus).isEmpty()) continue;
            out.add(new ReviewItem(entry, field, original, issue, suggestion));
        }
        return out;
    }

    /** The text of one field of one entry in the compact CV, or null if there is no such entry or field. */
    static String valueOf(JsonNode cv, String entryRef, String field) {
        for (JsonNode section : cv.path("sections")) {
            for (JsonNode entry : section.path("entries")) {
                if (entryRef.equals(entry.path("ref").asString(""))) {
                    JsonNode v = entry.path("values").path(field);
                    return v.isString() ? v.asString() : null;
                }
            }
        }
        return null;
    }

    /** Whitespace and bullet differences must not make the same text look different. */
    private static String squash(String s) {
        return s.replaceAll("[\\s\\u2022*\\-\\u2013\\u2014]+", " ").strip().toLowerCase();
    }
}
