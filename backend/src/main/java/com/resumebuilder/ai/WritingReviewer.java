package com.resumebuilder.ai;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.ReviewDtos.ModelReview;

import tools.jackson.databind.JsonNode;

/** Gives feedback on a CV's wording: the real model, or the built-in demo. */
public interface WritingReviewer {

    record Result(ModelReview review, Usage usage) {
    }

    /** @throws ChatModelClient.ModelException when the model cannot produce a usable result */
    Result review(JsonNode cv);

    boolean demo();

    String modelName();
}
