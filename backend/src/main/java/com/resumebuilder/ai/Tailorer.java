package com.resumebuilder.ai;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.TailorDtos.ModelRegen;
import com.resumebuilder.ai.TailorDtos.ModelTailor;

import tools.jackson.databind.JsonNode;

/** Proposes wording changes that fit a resume to a job: the real model, or the built-in demo. */
public interface Tailorer {

    record Result(ModelTailor tailor, Usage usage) {
    }

    record RegenResult(ModelRegen regen, Usage usage) {
    }

    /** @throws ChatModelClient.ModelException when the model cannot produce a usable result */
    Result tailor(JsonNode cv, String jobDescription, String language);

    /** New wording for one field. `previous` is what the user did not like; `hint` may be empty. */
    RegenResult regenerate(JsonNode cv, String jobDescription, String entry, String field, String previous, String hint, String language);

    boolean demo();

    String modelName();
}
