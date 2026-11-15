package com.resumebuilder.resume;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

public final class ResumeDtos {

    private ResumeDtos() {
    }

    public record ResumeSummary(UUID id, String title, String templateId, Instant updatedAt) {
    }

    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record ResumeResponse(
            UUID id,
            String title,
            String templateId,
            JsonNode data,
            JsonNode design,
            Instant createdAt,
            Instant updatedAt) {
    }

    /** data and design are optional on create; they default to empty objects. */
    public record CreateResumeRequest(
            @Size(max = 200) String title,
            @NotBlank @Size(max = 100) String templateId,
            JsonNode data,
            JsonNode design) {
    }

    /** Autosave sends the full resume each time. */
    public record UpdateResumeRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 100) String templateId,
            @NotNull JsonNode data,
            @NotNull JsonNode design) {
    }
}
