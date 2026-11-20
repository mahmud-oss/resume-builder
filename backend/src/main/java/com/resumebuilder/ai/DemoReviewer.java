package com.resumebuilder.ai;

import java.util.List;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.ReviewDtos.ModelReview;
import com.resumebuilder.ai.ReviewDtos.ReviewItem;

import tools.jackson.databind.JsonNode;

/** Used when no API key is set: gives one sample piece of feedback on the CV's first bullet, calling nothing. */
public class DemoReviewer implements WritingReviewer {

    @Override
    public Result review(JsonNode cv) {
        for (JsonNode section : cv.path("sections")) {
            for (JsonNode entry : section.path("entries")) {
                for (String field : List.of("description", "details", "text")) {
                    String value = entry.path("values").path(field).asString("");
                    String first = value.lines().map(String::strip).filter(l -> !l.isEmpty()).findFirst().orElse("");
                    if (!first.isEmpty()) {
                        ReviewItem item = new ReviewItem(entry.path("ref").asString(""), field, first,
                                "Demo mode: this is sample feedback, not a real review.",
                                first + " (sample suggestion)");
                        return new Result(new ModelReview("Demo mode: a sample review, not read by the AI.", List.of(item)), Usage.NONE);
                    }
                }
            }
        }
        return new Result(new ModelReview("Demo mode: there was no text to review.", List.of()), Usage.NONE);
    }

    @Override
    public boolean demo() {
        return true;
    }

    @Override
    public String modelName() {
        return "demo";
    }
}
