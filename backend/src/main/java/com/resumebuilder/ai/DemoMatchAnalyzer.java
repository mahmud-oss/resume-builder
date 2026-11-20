package com.resumebuilder.ai;

import java.util.ArrayList;
import java.util.List;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.MatchDtos.Matched;
import com.resumebuilder.ai.MatchDtos.Missing;
import com.resumebuilder.ai.MatchDtos.ModelMatch;
import com.resumebuilder.ai.MatchDtos.Suggestion;

import tools.jackson.databind.JsonNode;

/**
 * Used when no API key is set: a simple word-overlap sample, so the page can be tried at no cost. It treats
 * the first few capitalised words of the job description as "asked for" and says matching or missing by
 * whether the CV contains them. It is clearly marked as a demo and is not meaningful.
 */
public class DemoMatchAnalyzer implements MatchAnalyzer {

    @Override
    public Result analyze(JsonNode cv, String jobDescription, String language) {
        String cvText = ChatGuard.corpus(List.of(), cv).toLowerCase();
        List<Matched> matching = new ArrayList<>();
        List<Missing> missing = new ArrayList<>();
        List<String> seen = new ArrayList<>();
        for (String raw : jobDescription.split("[\\s,.;:()/]+")) {
            String w = raw.strip();
            if (w.length() < 3 || !Character.isUpperCase(w.charAt(0)) || seen.contains(w.toLowerCase()) || seen.size() >= 6) continue;
            seen.add(w.toLowerCase());
            if (cvText.contains(w.toLowerCase())) matching.add(new Matched(w, w));
            else missing.add(new Missing(w, "required", w));
        }
        String band = matching.isEmpty() ? "low" : missing.isEmpty() ? "strong" : matching.size() >= missing.size() ? "good" : "partial";
        ModelMatch match = new ModelMatch(band, "Demo mode: this is a sample match based on a few capitalised words, not a real analysis.",
                "", "", matching, missing,
                List.of(new Suggestion("Demo mode: real suggestions appear when the AI is switched on.", "")));
        return new Result(match, Usage.NONE);
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
