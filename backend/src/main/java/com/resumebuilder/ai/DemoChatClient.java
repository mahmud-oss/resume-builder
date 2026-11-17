package com.resumebuilder.ai;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.resumebuilder.ai.ChatDtos.DraftText;
import com.resumebuilder.ai.ChatDtos.KeyValue;
import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Topics;
import com.resumebuilder.ai.ChatDtos.Update;

import tools.jackson.databind.JsonNode;

/**
 * A scripted stand-in used when no API key is set. It asks for each empty field in turn and puts the user's
 * answer into it, so the whole flow (live updates, drafts, skipping, the checklist) can be developed and
 * tested without calling an AI or spending money. It understands nothing: it is not the product.
 */
public class DemoChatClient implements ChatModelClient {

    private record Spec(String field, String question, boolean draft) {
    }

    private record Step(String topic, String entryRef, String field, String question, boolean draft, boolean basics) {
    }

    private static final List<String> DEFAULT_ORDER = List.of("basics", "experience", "education", "projects", "skills",
            "languages", "certifications", "references", "summary");

    private static final Map<String, List<Spec>> SPECS = Map.of(
            "basics", List.of(
                    new Spec("fullName", "What is your full name?", false),
                    new Spec("headline", "What job title do you want on your CV?", false),
                    new Spec("email", "What is your email address?", false),
                    new Spec("phone", "What is your phone number?", false),
                    new Spec("location", "Which city do you live in?", false)),
            "experience", List.of(
                    new Spec("role", "What was your most recent job title?", false),
                    new Spec("company", "Which company was that at?", false),
                    new Spec("startDate", "When did you start? (for example Jan 2022)", false),
                    new Spec("endDate", "When did you finish? (or write Present)", false),
                    new Spec("description", "Tell me what you did there, and I will write it up as a draft.", true)),
            "education", List.of(
                    new Spec("degree", "What is your highest degree or course?", false),
                    new Spec("institution", "Where did you study?", false),
                    new Spec("endDate", "When did you finish?", false)),
            "projects", List.of(
                    new Spec("name", "What is a project you are proud of?", false),
                    new Spec("description", "Tell me what it does and what you did, and I will draft it.", true)),
            "skills", List.of(
                    new Spec("category", "What kind of skills are these (for example Programming)?", false),
                    new Spec("skills", "List them, separated by commas.", false)),
            "languages", List.of(
                    new Spec("language", "Which language do you speak?", false),
                    new Spec("level", "How well (for example Native, Fluent)?", false)),
            "certifications", List.of(
                    new Spec("name", "What is the name of a certification you hold?", false),
                    new Spec("issuer", "Who issued it?", false),
                    new Spec("date", "When did you get it?", false)),
            "references", List.of(
                    new Spec("name", "Who can give you a reference?", false),
                    new Spec("contact", "How can they be contacted?", false)),
            "summary", List.of(
                    new Spec("text", "Last one: tell me in a sentence or two what you do best, and I will draft a summary.", true)));

    @Override
    public Result complete(List<Message> history, JsonNode cv, Topics topics, List<ChatDtos.PendingDraft> pendingDrafts, String correction) {
        List<String> order = topics != null && topics.order() != null && !topics.order().isEmpty()
                ? topics.order() : DEFAULT_ORDER;
        Set<String> skipped = new LinkedHashSet<>(topics != null && topics.skipped() != null ? topics.skipped() : List.of());
        Set<String> filled = new LinkedHashSet<>();

        String said = lastUser(history).strip();
        // "Let's go to: Education" is a request to change topic, not an answer. The browser has already put
        // that topic in `current`; going back to a skipped topic un-skips it.
        boolean jump = said.startsWith("Let's go to:") && topics != null && topics.current() != null && !topics.current().isBlank();
        String focus = jump ? topics.current() : null;
        if (jump) skipped.remove(focus);
        boolean replied = history.size() > 1 && !jump;

        List<Update> updates = new ArrayList<>();
        List<DraftText> drafts = new ArrayList<>();
        StringBuilder lead = new StringBuilder();

        Step pending = nextStep(cv, order(order, focus), skipped, filled);
        if (replied && pending != null) {
            if (said.matches("(?i)^(skip|skip this|chharo|ছাড়ো)\\W*$")) {
                skipped.add(pending.topic());
                lead.append("No problem, we will skip ").append(pending.topic()).append(". ");
            } else if (said.toLowerCase().contains("certificat") && !hasSection(cv, "certifications")) {
                updates.add(new Update("add_section", "certifications", "", "", "", List.of()));
                lead.append("I added a Certifications section. ");
            } else if (said.toLowerCase().startsWith("job:")) {
                updates.add(new Update("add_entry", "experience", "", "", "",
                        List.of(new KeyValue("role", said.substring(4).strip()))));
                lead.append("Added that job. ");
            } else if (pending.draft()) {
                drafts.add(new DraftText("d1", pending.entryRef(), pending.field(), draftFrom(said)));
                filled.add(pending.topic() + "/" + pending.field());
                lead.append("Here is a draft. Accept it, change it, or ask me to redo it. ");
            } else {
                updates.add(pending.basics()
                        ? new Update("set_basics", "", "", pending.field(), said, List.of())
                        : new Update("set_field", "", pending.entryRef(), pending.field(), said, List.of()));
                filled.add(pending.topic() + "/" + pending.field());
                lead.append("Got it. ");
            }
        } else if (!replied) {
            lead.append("Hi! I am the demo assistant: no AI key is set, so I follow a fixed script. ");
        }

        Step next = nextStep(cv, order(order, focus), skipped, filled);
        List<String> completed = new ArrayList<>();
        for (String topic : order) {
            if (!skipped.contains(topic) && !hasPendingIn(cv, topic, skipped, filled)) completed.add(topic);
        }
        String message = next == null
                ? lead + "That is everything. Your CV is ready to review and download."
                : lead + next.question();
        ModelTurn turn = new ModelTurn(message, updates, drafts, next == null ? "" : next.topic(), completed,
                new ArrayList<>(skipped), next == null ? List.of() : List.of("Skip"));
        return new Result(turn, Usage.NONE);
    }

    /** The topic to work on first (if any), then the rest in order. */
    private static List<String> order(List<String> order, String focus) {
        if (focus == null) return order;
        List<String> out = new ArrayList<>();
        out.add(focus);
        for (String t : order) if (!t.equals(focus)) out.add(t);
        return out;
    }

    private static String draftFrom(String said) {
        // Keep the user's own words, one point per line. Nothing is added.
        List<String> lines = new ArrayList<>();
        for (String part : said.split("(?<=[.!?])\\s+|\\n+")) {
            String t = part.strip();
            if (!t.isEmpty()) lines.add(t);
        }
        return String.join("\n", lines);
    }

    private static String lastUser(List<Message> history) {
        for (int i = history.size() - 1; i >= 0; i--) {
            if ("user".equals(history.get(i).role())) return history.get(i).content();
        }
        return "";
    }

    private static boolean hasSection(JsonNode cv, String type) {
        for (JsonNode s : cv.path("sections")) {
            if (type.equals(s.path("type").asString())) return true;
        }
        return false;
    }

    private static boolean hasPendingIn(JsonNode cv, String topic, Set<String> skipped, Set<String> filled) {
        return stepsFor(cv, topic, filled).stream().findAny().isPresent();
    }

    private static Step nextStep(JsonNode cv, List<String> order, Set<String> skipped, Set<String> filled) {
        for (String topic : order) {
            if (skipped.contains(topic)) continue;
            List<Step> steps = stepsFor(cv, topic, filled);
            if (!steps.isEmpty()) return steps.get(0);
        }
        return null;
    }

    /** The empty fields of one topic, in the order to ask. */
    private static List<Step> stepsFor(JsonNode cv, String topic, Set<String> filled) {
        List<Spec> specs = SPECS.get(topic);
        if (specs == null) return List.of();
        List<Step> out = new ArrayList<>();
        if ("basics".equals(topic)) {
            for (Spec s : specs) {
                if (cv.path("basics").path(s.field()).asString("").isBlank() && !filled.contains(topic + "/" + s.field())) {
                    out.add(new Step(topic, "", s.field(), s.question(), s.draft(), true));
                }
            }
            return out;
        }
        for (JsonNode section : cv.path("sections")) {
            if (!topic.equals(section.path("type").asString())) continue;
            JsonNode entry = section.path("entries").path(0);
            if (entry.isMissingNode()) return List.of();
            String ref = entry.path("ref").asString("");
            for (Spec s : specs) {
                if (entry.path("values").path(s.field()).asString("").isBlank() && !filled.contains(topic + "/" + s.field())) {
                    out.add(new Step(topic, ref, s.field(), s.question(), s.draft(), false));
                }
            }
            return out;
        }
        return List.of();
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
