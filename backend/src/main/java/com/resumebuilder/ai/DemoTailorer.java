package com.resumebuilder.ai;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.TailorDtos.ModelChange;
import com.resumebuilder.ai.TailorDtos.ModelRegen;
import com.resumebuilder.ai.TailorDtos.ModelTailor;

import tools.jackson.databind.JsonNode;

/**
 * Used when no API key is set: it only reverses the order of the first skills list, which is always allowed and
 * changes no facts, so the whole accept/reject flow can be tried at no cost. Clearly marked as a demo.
 */
public class DemoTailorer implements Tailorer {

    private static String reversed(String skills) {
        List<String> parts = new ArrayList<>(Arrays.stream(skills.split("[,;]")).map(String::strip).filter(s -> !s.isEmpty()).toList());
        Collections.reverse(parts);
        return String.join(", ", parts);
    }

    @Override
    public Result tailor(JsonNode cv, String jobDescription, String language) {
        List<ModelChange> changes = new ArrayList<>();
        for (JsonNode section : cv.path("sections")) {
            if (!"skills".equals(section.path("type").asString(""))) continue;
            for (JsonNode entry : section.path("entries")) {
                String skills = entry.path("values").path("skills").asString("");
                if (skills.split("[,;]").length >= 2 && changes.isEmpty()) {
                    changes.add(new ModelChange(entry.path("ref").asString(""), "skills", reversed(skills),
                            "Demo mode: a sample change that only reverses the order of your skills."));
                }
            }
        }
        return new Result(new ModelTailor("", "", changes), Usage.NONE);
    }

    @Override
    public RegenResult regenerate(JsonNode cv, String jobDescription, String entry, String field, String previous, String hint, String language) {
        String skills = "";
        for (JsonNode section : cv.path("sections")) {
            for (JsonNode e : section.path("entries")) {
                if (entry.equals(e.path("ref").asString(""))) skills = e.path("values").path(field).asString("");
            }
        }
        // Skills get rotated by one place (always allowed, no facts change); anything else gets a marked sample.
        String after;
        if ("skills".equals(field)) {
            List<String> parts = new ArrayList<>(Arrays.stream(skills.split("[,;]")).map(String::strip).filter(x -> !x.isEmpty()).toList());
            if (parts.size() > 1) Collections.rotate(parts, -1);
            after = String.join(", ", parts);
        } else {
            after = skills + " (demo)";
        }
        return new RegenResult(new ModelRegen(after, "Demo mode: a sample alternative."), Usage.NONE);
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
