package com.resumebuilder.ai;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** The shapes exchanged between the browser, this server and the AI for the chat builder. */
public final class ChatDtos {

    private ChatDtos() {
    }

    /** One line of the conversation. The browser keeps the history and sends it each time. */
    public record Message(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 6000) String content) {
    }

    /** Where the conversation is in the checklist. Every list may be null. */
    public record Topics(List<String> order, List<String> completed, List<String> skipped, String current) {
    }

    /** A draft the user has not accepted yet, so the assistant does not write it again. */
    public record PendingDraft(@Size(max = 60) String entry, @Size(max = 60) String field, @Size(max = 2500) String text) {
    }

    /**
     * @param cv the CV as it is now, in a compact form the browser builds (never the photo)
     */
    public record ChatRequest(
            @NotNull @Size(min = 1, max = 60) List<@Valid Message> messages,
            @NotNull JsonNode cv,
            Topics topics,
            @Size(max = 10) List<@Valid PendingDraft> pendingDrafts) {
    }

    public record KeyValue(String field, String value) {
    }

    /**
     * One change to the CV, made from facts the user stated. Actions: set_basics, set_field, add_entry,
     * add_section. Fields that do not apply are empty strings.
     */
    public record Update(String action, String section, String entry, String field, String value,
                         List<KeyValue> values) {
    }

    /** Text the AI wrote from the user's facts. The user accepts, regenerates or edits it. */
    public record Draft(String id, String entry, String field, String text, List<String> warnings) {
    }

    /** What the model returns for one turn (also the schema it is held to). */
    public record ModelTurn(
            String message,
            List<Update> updates,
            List<DraftText> drafts,
            String currentTopic,
            List<String> completedTopics,
            List<String> skippedTopics,
            List<String> suggestedReplies) {
    }

    public record DraftText(String id, String entry, String field, String text) {
    }

    public record ChatResponse(
            String message,
            List<Update> updates,
            List<Draft> drafts,
            String currentTopic,
            List<String> completedTopics,
            List<String> skippedTopics,
            List<String> suggestedReplies,
            boolean demo) {
    }

    public record Status(boolean enabled, boolean demo, String model) {
    }
}
