package com.resumebuilder.ai;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.TailorDtos.Change;
import com.resumebuilder.ai.TailorDtos.ModelChange;
import com.resumebuilder.ai.TailorDtos.ModelTailor;
import com.resumebuilder.ai.TailorDtos.RegenerateRequest;
import com.resumebuilder.ai.TailorDtos.RegenerateResponse;
import com.resumebuilder.ai.TailorDtos.TailorRequest;
import com.resumebuilder.ai.TailorDtos.TailorResponse;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;

/**
 * Tailored Resume (PRD §11.8). The model proposes wording changes; this class holds them to the rules before the
 * user sees any (TR-10, TR-11): only the summary, experience and project bullets and the order of skills may change;
 * the "before" text is read from the CV here, never taken from the model; a change may not add a number, a skill,
 * or a specific term (an acronym or tool name) that the job description has but the CV does not. Free for now; a
 * daily cap can be set with `app.ai.max-tailors-per-day` (0 means none).
 */
@Service
public class TailorService {

    private static final Logger log = LoggerFactory.getLogger(TailorService.class);

    private static final int MAX_CV_CHARS = 80_000;
    static final int MAX_CHANGES = 12;
    private static final int MAX_AFTER = 3000;

    /** Section type to the only field of it that may change. */
    static final Map<String, String> EDITABLE = Map.of("summary", "text", "experience", "description", "projects", "description", "skills", "skills");

    private final Tailorer tailorer;
    private final AiUsageRepository usage;
    private final AiRateLimiter limiter = new AiRateLimiter(6);
    private final int maxPerDay;

    TailorService(Tailorer tailorer, AiUsageRepository usage, @Value("${app.ai.max-tailors-per-day:0}") int maxPerDay) {
        this.tailorer = tailorer;
        this.usage = usage;
        this.maxPerDay = maxPerDay;
    }

    // --- the endpoints ------------------------------------------------------------------------

    public TailorResponse tailor(UUID userId, TailorRequest request) {
        JsonNode cv = request.cv();
        String jd = prepare(userId, cv, request.jobDescription(), "tailor");
        Tailorer.Result result;
        try {
            result = tailorer.tailor(cv, jd, language(request.language()));
        } catch (ModelException e) {
            usage.record(userId, "tailor_failed", tailorer.modelName(), tailorer.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "tailor", tailorer.modelName(), tailorer.demo(), result.usage());
        TailorResponse checked = checked(result.tailor(), cv, jd, tailorer.demo());
        log.info("Tailor: {} of {} proposed changes kept (model {}).", checked.changes().size(),
                result.tailor().changes() == null ? 0 : result.tailor().changes().size(), tailorer.modelName());
        return checked;
    }

    public RegenerateResponse regenerate(UUID userId, RegenerateRequest request) {
        JsonNode cv = request.cv();
        String jd = prepare(userId, cv, request.jobDescription(), "tailor_regen");
        if (locate(cv, request.entry(), request.field()) == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That part of the resume cannot be changed.");
        }
        Tailorer.RegenResult result;
        try {
            result = tailorer.regenerate(cv, jd, request.entry(), request.field(), request.previous(), request.hint(), language(request.language()));
        } catch (ModelException e) {
            usage.record(userId, "tailor_regen_failed", tailorer.modelName(), tailorer.demo(), Usage.NONE);
            throw new ApiException(HttpStatus.valueOf(e.status()), e.getMessage());
        }
        usage.record(userId, "tailor_regen", tailorer.modelName(), tailorer.demo(), result.usage());
        Change change = checkedChange(new ModelChange(request.entry(), request.field(), result.regen().after(), result.regen().reason()), cv, jd, "r");
        if (change == null || (request.previous() != null && squash(change.after()).equals(squash(request.previous())))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "We could not find different wording that stays true to your resume. Keep it as it is, or edit it by hand.");
        }
        return new RegenerateResponse(change.after(), change.reason(), tailorer.demo());
    }

    private String prepare(UUID userId, JsonNode cv, String jobDescription, String action) {
        if (cv == null || !cv.isObject() || cv.toString().length() > MAX_CV_CHARS) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "This resume is too large to tailor.");
        }
        String jd = jobDescription == null ? "" : jobDescription.strip();
        if (jd.length() < 20) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please paste the job description (at least a few lines).");
        }
        if (!limiter.tryAcquire(userId, System.currentTimeMillis())) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You are going too fast. Please wait a moment.");
        }
        if (!tailorer.demo() && maxPerDay > 0
                && usage.countSince(userId, Instant.now().minus(Duration.ofDays(1)),
                        List.of("tailor", "tailor_failed", "tailor_regen", "tailor_regen_failed")) >= maxPerDay) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "You have reached today's limit for tailoring. Please try again tomorrow.");
        }
        return jd;
    }

    private static String language(String l) {
        return "bn".equals(l) ? "bn" : "en";
    }

    // --- holding the model to the rules -------------------------------------------------------

    static TailorResponse checked(ModelTailor m, JsonNode cv, String jd, boolean demo) {
        List<Change> out = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        if (m.changes() != null) {
            for (ModelChange c : m.changes()) {
                if (c == null || out.size() >= MAX_CHANGES) continue;
                Change change = checkedChange(c, cv, jd, "c" + (out.size() + 1));
                if (change != null && seen.add(change.entry() + "|" + change.field())) out.add(change);
            }
        }
        return new TailorResponse(ChatGuard.clean(m.jobTitle(), 120), ChatGuard.clean(m.company(), 120), out, demo);
    }

    /** One change, or null if it breaks a rule. */
    static Change checkedChange(ModelChange c, JsonNode cv, String jd, String id) {
        String entry = ChatGuard.clean(c.entry(), 60);
        String field = ChatGuard.clean(c.field(), 60);
        String[] located = locate(cv, entry, field);
        if (located == null) return null; // not a part of the resume that may change
        String type = located[0];
        String before = located[1];

        String after = tidy(type, c.after());
        if (after.isEmpty() || squash(after).equals(squash(before))) return null;

        String corpus = ChatGuard.corpus(List.of(), cv);
        if (!ChatGuard.numbersNotIn(after, corpus).isEmpty()) return null; // a number the CV does not have
        for (String term : jdOnlyTerms(jd, corpus)) {
            if (containsTerm(after, term)) return null; // a skill or tool the job wants and the CV lacks
        }
        if ("skills".equals(type)) {
            if (!sameSkills(before, after)) return null; // skills may only be reordered
        } else if ("experience".equals(type) || "projects".equals(type)) {
            long was = before.lines().filter(l -> !l.isBlank()).count();
            long now = after.lines().filter(l -> !l.isBlank()).count();
            if (now < 1 || now > Math.max(2, was * 2)) return null;
        }
        return new Change(id, entry, field, before, after, ChatGuard.clean(c.reason(), 300));
    }

    /** {section type, current text} when the entry exists and the field is the one that may change, else null. */
    static String[] locate(JsonNode cv, String entryRef, String field) {
        for (JsonNode section : cv.path("sections")) {
            String type = section.path("type").asString("");
            String allowed = EDITABLE.get(type);
            for (JsonNode entry : section.path("entries")) {
                if (!entryRef.equals(entry.path("ref").asString(""))) continue;
                if (allowed == null || !allowed.equals(field)) return null;
                JsonNode v = entry.path("values").path(field);
                String text = v.isString() ? v.asString().strip() : "";
                return text.isEmpty() ? null : new String[] {type, text};
            }
        }
        return null;
    }

    /** Tidies the model's wording to the shape of the field: bullets one per line, the rest one line. */
    private static String tidy(String type, String raw) {
        String text = ChatGuard.clean(raw, MAX_AFTER);
        if (text.isEmpty()) return "";
        if ("experience".equals(type) || "projects".equals(type)) return ChatGuard.plainLines(text);
        if ("skills".equals(type)) return String.join(", ", Arrays.stream(text.split("[,;\\n]")).map(String::strip).filter(s -> !s.isEmpty()).toList());
        return ChatGuard.plainLines(text).replace('\n', ' ');
    }

    /** The same skills in any order, none added, removed or renamed (case aside), and in a different order. */
    static boolean sameSkills(String before, String after) {
        List<String> a = skillList(before);
        List<String> b = skillList(after);
        if (a.size() != b.size()) return false;
        List<String> sa = a.stream().map(s -> s.toLowerCase(Locale.ROOT)).sorted().toList();
        List<String> sb = b.stream().map(s -> s.toLowerCase(Locale.ROOT)).sorted().toList();
        if (!sa.equals(sb)) return false;
        return !a.stream().map(s -> s.toLowerCase(Locale.ROOT)).toList().equals(b.stream().map(s -> s.toLowerCase(Locale.ROOT)).toList());
    }

    private static List<String> skillList(String text) {
        return Arrays.stream(text.split("[,;\\n]")).map(String::strip).filter(s -> !s.isEmpty()).toList();
    }

    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9+#.]{2,}");

    /**
     * Specific terms in the job description (acronyms like SAP, names with digits or + # like C++ or ES6, names like
     * Node.js) that the CV never mentions. A rewrite may not use them: the CV does not show that experience.
     */
    static Set<String> jdOnlyTerms(String jd, String cvCorpus) {
        String cvLower = cvCorpus.toLowerCase(Locale.ROOT);
        Set<String> out = new LinkedHashSet<>();
        Matcher m = TOKEN.matcher(jd);
        while (m.find()) {
            String t = m.group().replaceAll("^\\.+|\\.+$", "");
            if (t.length() < 2) continue;
            boolean letters = t.chars().anyMatch(Character::isLetter);
            if (!letters) continue;
            boolean acronym = t.equals(t.toUpperCase(Locale.ROOT)) && t.chars().filter(Character::isLetter).count() >= 2;
            boolean digitsOrSymbols = t.chars().anyMatch(Character::isDigit) || t.contains("+") || t.contains("#");
            boolean dotted = t.matches("[A-Za-z]+\\.[A-Za-z]+");
            if (!(acronym || digitsOrSymbols || dotted)) continue;
            if (!containsTerm(cvLower, t.toLowerCase(Locale.ROOT))) out.add(t);
        }
        return out;
    }

    /** Whole-word, case-insensitive match, so "SAP" is not found inside "SAPLING". */
    static boolean containsTerm(String text, String term) {
        return Pattern.compile("(?<![A-Za-z0-9])" + Pattern.quote(term) + "(?![A-Za-z0-9])", Pattern.CASE_INSENSITIVE).matcher(text).find();
    }

    static String squash(String s) {
        return ChatGuard.asciiDigits(s == null ? "" : s).replaceAll("[\\s\\u2022*\\u2013\\u2014\\-]+", " ").strip().toLowerCase(Locale.ROOT);
    }
}
