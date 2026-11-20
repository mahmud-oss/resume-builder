package com.resumebuilder.ai;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.MatchDtos.ModelMatch;

import tools.jackson.databind.JsonNode;

/** Compares a CV with a job description: the real model, or the built-in demo. */
public interface MatchAnalyzer {

    record Result(ModelMatch match, Usage usage) {
    }

    /** @throws ChatModelClient.ModelException when the model cannot produce a usable result */
    Result analyze(JsonNode cv, String jobDescription, String language);

    boolean demo();

    String modelName();
}
