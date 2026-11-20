package com.resumebuilder.ai;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** Shapes for Job Match: one analysis of a CV against a job description, shared by the tools that need it. */
public final class MatchDtos {

    private MatchDtos() {
    }

    /**
     * @param cv the CV in the compact form the browser builds for the chat (never the photo)
     * @param language the language of the explanations: "en" or "bn". The matching is always done in English
     */
    public record MatchRequest(
            @NotNull JsonNode cv,
            @NotBlank @Size(max = 10_000) String jobDescription,
            @Pattern(regexp = "en|bn") String language) {
    }

    /** A skill the job asks for that the CV shows. @param evidence a short quote from the CV that shows it */
    public record Matched(String skill, String evidence) {
    }

    /**
     * A skill the job asks for that the CV does not show.
     * @param importance "required" or "nice"
     * @param jdQuote a short quote from the job description where it is asked for
     */
    public record Missing(String skill, String importance, String jdQuote) {
    }

    /** @param entry a reference to the CV entry it is about (for example "experience.1"), or "" */
    public record Suggestion(String text, String entry) {
    }

    /** What the model returns. @param band "strong", "good", "partial" or "low" */
    public record ModelMatch(String band, String summary, String jobTitle, String company, List<Matched> matching,
                             List<Missing> missing, List<Suggestion> suggestions) {
    }

    public record MatchResponse(String band, String summary, String jobTitle, String company, List<Matched> matching,
                                List<Missing> missing, List<Suggestion> suggestions, boolean demo) {
    }
}
