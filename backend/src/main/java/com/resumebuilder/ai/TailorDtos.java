package com.resumebuilder.ai;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** Shapes for Tailored Resume (PRD §11.8): proposed changes the user accepts or rejects one by one. */
public final class TailorDtos {

    private TailorDtos() {
    }

    /** @param cv the original resume in the compact form the browser builds for the chat (never the photo) */
    public record TailorRequest(
            @NotNull JsonNode cv,
            @NotBlank @Size(max = 10_000) String jobDescription,
            @Pattern(regexp = "en|bn") String language) {
    }

    /**
     * Asks for different wording for one proposed change.
     * @param previous the wording the user did not like
     * @param hint a short steer such as "more concise" (may be empty)
     */
    public record RegenerateRequest(
            @NotNull JsonNode cv,
            @NotBlank @Size(max = 10_000) String jobDescription,
            @NotBlank @Size(max = 60) String entry,
            @NotBlank @Size(max = 60) String field,
            @Size(max = 3000) String previous,
            @Size(max = 120) String hint,
            @Pattern(regexp = "en|bn") String language) {
    }

    /** What the model proposes for one field. */
    public record ModelChange(String entry, String field, String after, String reason) {
    }

    public record ModelTailor(String jobTitle, String company, List<ModelChange> changes) {
    }

    public record ModelRegen(String after, String reason) {
    }

    /** One change, with the current text filled in by the server (never taken from the model). */
    public record Change(String id, String entry, String field, String before, String after, String reason) {
    }

    public record TailorResponse(String jobTitle, String company, List<Change> changes, boolean demo) {
    }

    public record RegenerateResponse(String after, String reason, boolean demo) {
    }
}
