package com.resumebuilder.ai;

import java.util.List;

import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Topics;

import tools.jackson.databind.JsonNode;

/** Whatever produces the assistant's next turn: the real model, or the built-in demo. */
public interface ChatModelClient {

    /**
     * @param pending drafts the user has not decided on yet (may be empty)
     * @param correction an instruction to fix a problem with the previous attempt, or null
     */
    Result complete(List<Message> history, JsonNode cv, Topics topics, List<ChatDtos.PendingDraft> pending, String correction);

    boolean demo();

    String modelName();

    record Usage(int inputTokens, int outputTokens, int cacheReadTokens) {
        static final Usage NONE = new Usage(0, 0, 0);
    }

    record Result(ModelTurn turn, Usage usage) {
    }

    /** The model could not produce a usable reply. `status` is the HTTP status to give the user. */
    class ModelException extends RuntimeException {
        private final int status;

        public ModelException(int status, String message, Throwable cause) {
            super(message, cause);
            this.status = status;
        }

        public int status() {
            return status;
        }
    }
}
