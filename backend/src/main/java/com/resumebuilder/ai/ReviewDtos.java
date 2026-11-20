package com.resumebuilder.ai;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

/** Shapes for the writing review (the ATS checker's AI part). */
public final class ReviewDtos {

    private ReviewDtos() {
    }

    /** @param cv the CV in the compact form the browser builds for the chat (never the photo) */
    public record ReviewRequest(@NotNull JsonNode cv) {
    }

    /**
     * One piece of feedback.
     * @param entry reference to the entry, for example "experience.1" or "summary.1"
     * @param field the field in that entry, for example "description" or "text"
     * @param original the text being commented on, exactly as it is in the CV
     * @param issue what is weak about it, in one sentence
     * @param suggestion a rewrite that uses only facts already in the CV
     */
    public record ReviewItem(String entry, String field, String original, String issue, String suggestion) {
    }

    /** What the model returns. */
    public record ModelReview(String summary, List<ReviewItem> items) {
    }

    public record ReviewResponse(String summary, List<ReviewItem> items, boolean demo) {
    }
}
