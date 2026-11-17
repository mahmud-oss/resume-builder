package com.resumebuilder.ai;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.resumebuilder.ai.ChatDtos.DraftText;
import com.resumebuilder.ai.ChatDtos.KeyValue;
import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Update;

import tools.jackson.databind.JsonNode;

/**
 * Checks and tidies what the model sends back before anything reaches the user: sizes, allowed actions, and
 * one cheap test of the "facts only" rule (a draft may not contain a number the user never gave).
 */
final class ChatGuard {

    static final Set<String> ACTIONS = Set.of("set_basics", "set_field", "add_entry", "add_section");

    static final int MAX_MESSAGE = 1200;
    static final int MAX_VALUE = 2000;
    static final int MAX_DRAFT = 2500;
    static final int MAX_UPDATES = 40;
    static final int MAX_DRAFTS = 3;
    static final int MAX_REPLIES = 3;
    static final int MAX_TOPICS = 20;

    private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)*");
    /** Names in the CV state that hold labels and references, not what the user said. */
    private static final Set<String> NOT_USER_TEXT = Set.of("ref", "key", "label", "kind", "type", "template", "title");

    private ChatGuard() {
    }

    // --- tidy ---------------------------------------------------------------------------------

    static String clean(String s, int max) {
        if (s == null) return "";
        String t = s.replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", "").strip();
        return t.length() > max ? t.substring(0, max).strip() : t;
    }

    private static List<String> cleanList(List<String> in, int count, int each) {
        if (in == null) return List.of();
        List<String> out = new ArrayList<>();
        for (String s : in) {
            String c = clean(s, each);
            if (!c.isEmpty() && !out.contains(c)) out.add(c);
            if (out.size() >= count) break;
        }
        return out;
    }

    private static final Pattern LEADING_MARKER = Pattern.compile("^\\s*(?:[-*•–—·]+|\\d+[.)])(?:\\s+|$)");

    /** One point per line with no bullet symbol, dash or number in front: the CV draws its own bullets. */
    static String plainLines(String text) {
        StringBuilder out = new StringBuilder();
        for (String line : text.split("\\R")) {
            String t = LEADING_MARKER.matcher(line).replaceFirst("").strip();
            if (t.isEmpty()) continue;
            if (out.length() > 0) out.append('\n');
            out.append(t);
        }
        return out.toString();
    }

    /** Drops anything unusable and caps sizes. A turn with no message gets a plain fallback. */
    static ModelTurn sanitise(ModelTurn t) {
        List<Update> updates = new ArrayList<>();
        if (t.updates() != null) {
            for (Update u : t.updates()) {
                if (u == null || u.action() == null || !ACTIONS.contains(u.action())) continue;
                List<KeyValue> values = new ArrayList<>();
                if (u.values() != null) {
                    for (KeyValue kv : u.values()) {
                        if (kv != null && !clean(kv.field(), 60).isEmpty()) {
                            values.add(new KeyValue(clean(kv.field(), 60), clean(kv.value(), MAX_VALUE)));
                        }
                    }
                }
                updates.add(new Update(u.action(), clean(u.section(), 60), clean(u.entry(), 60), clean(u.field(), 60),
                        clean(u.value(), MAX_VALUE), values));
                if (updates.size() >= MAX_UPDATES) break;
            }
        }
        List<DraftText> drafts = new ArrayList<>();
        if (t.drafts() != null) {
            for (DraftText d : t.drafts()) {
                if (d == null || plainLines(clean(d.text(), MAX_DRAFT)).isEmpty() || clean(d.entry(), 60).isEmpty()
                        || clean(d.field(), 60).isEmpty()) continue;
                String id = clean(d.id(), 20);
                drafts.add(new DraftText(id.isEmpty() ? "d" + (drafts.size() + 1) : id, clean(d.entry(), 60),
                        clean(d.field(), 60), plainLines(clean(d.text(), MAX_DRAFT))));
                if (drafts.size() >= MAX_DRAFTS) break;
            }
        }
        String message = clean(t.message(), MAX_MESSAGE);
        if (message.isEmpty()) message = "Okay. Please tell me more.";
        return new ModelTurn(message, updates, drafts, clean(t.currentTopic(), 60),
                cleanList(t.completedTopics(), MAX_TOPICS, 60), cleanList(t.skippedTopics(), MAX_TOPICS, 60),
                cleanList(t.suggestedReplies(), MAX_REPLIES, 80));
    }

    // --- facts only -----------------------------------------------------------------------------

    /** Bangla and other digits to 0-9, so "৩ বছর" and "3 years" count as the same number. */
    static String asciiDigits(String s) {
        StringBuilder out = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            out.append(Character.isDigit(c) ? (char) ('0' + Character.digit(c, 10)) : c);
        }
        return out.toString();
    }

    private static String normalise(String number) {
        return number.replace(",", "");
    }

    /** Everything the user has said: their messages and the text already in the CV. */
    static String corpus(List<Message> history, JsonNode cv) {
        StringBuilder sb = new StringBuilder();
        for (Message m : history) {
            if ("user".equals(m.role())) sb.append(m.content()).append('\n');
        }
        collectText(cv, sb);
        return asciiDigits(sb.toString());
    }

    private static void collectText(JsonNode node, StringBuilder out) {
        if (node == null) return;
        if (node.isString()) {
            out.append(node.asString()).append('\n');
        } else if (node.isObject()) {
            for (var entry : node.properties()) {
                if (!NOT_USER_TEXT.contains(entry.getKey())) collectText(entry.getValue(), out);
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) collectText(child, out);
        }
    }

    /** Numbers in `text` that appear nowhere in `corpus`. */
    static List<String> numbersNotIn(String text, String corpus) {
        Set<String> known = new LinkedHashSet<>();
        Matcher known_ = NUMBER.matcher(corpus);
        while (known_.find()) known.add(normalise(known_.group()));
        List<String> missing = new ArrayList<>();
        Matcher m = NUMBER.matcher(asciiDigits(text));
        while (m.find()) {
            String n = normalise(m.group());
            if (!known.contains(n) && !missing.contains(n)) missing.add(n);
        }
        return missing;
    }
}
