package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.anthropic.core.JsonValue;
import com.resumebuilder.ai.ChatDtos.Topics;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ChatPromptsTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    /** Structured output needs every object to list all its properties as required and forbid extras. */
    private void checkObjects(Object node) {
        if (node instanceof JsonValue v) {
            checkObjects(v.asObject().orElse(null) == null ? v.asArray().orElse(null) : v.asObject().get());
            return;
        }
        if (node instanceof Map<?, ?> m) {
            if ("object".equals(unwrap(m.get("type")))) {
                Map<?, ?> props = (Map<?, ?>) unwrapMap(m.get("properties"));
                List<?> required = (List<?>) unwrapList(m.get("required"));
                assertThat(required.stream().map(Object::toString).toList())
                        .containsExactlyInAnyOrderElementsOf(props.keySet().stream().map(Object::toString).toList());
                assertThat(unwrap(m.get("additionalProperties"))).isEqualTo(false);
            }
            m.values().forEach(this::checkObjects);
        } else if (node instanceof List<?> l) {
            l.forEach(this::checkObjects);
        }
    }

    private static Object unwrap(Object o) {
        if (o instanceof JsonValue v) {
            if (v.asString().isPresent()) return v.asString().get();
            if (v.asBoolean().isPresent()) return v.asBoolean().get();
        }
        return o;
    }

    private static Object unwrapMap(Object o) {
        return o instanceof JsonValue v ? v.asObject().orElseThrow() : o;
    }

    private static Object unwrapList(Object o) {
        return o instanceof JsonValue v ? v.asArray().orElseThrow() : o;
    }

    @Test
    void theOutputSchemaIsStrictAtEveryLevel() {
        Map<String, JsonValue> schema = ChatPrompts.schema();
        assertThat(schema).containsKeys("type", "properties", "required", "additionalProperties");
        checkObjects(schema);
        Map<?, ?> props = (Map<?, ?>) unwrapMap(schema.get("properties"));
        assertThat(props.keySet().stream().map(Object::toString).toList()).containsExactlyInAnyOrder("message", "updates", "drafts", "currentTopic",
                "completedTopics", "skippedTopics", "suggestedReplies");
    }

    @Test
    void theSchemaOnlyAllowsTheActionsTheGuardAccepts() {
        String json = ChatPrompts.schema().toString();
        for (String action : ChatGuard.ACTIONS) assertThat(json).contains(action);
    }

    @Test
    void thePromptStatesTheRulesThatMatter() {
        String p = ChatPrompts.SYSTEM;
        assertThat(p).contains("Banglish").contains("Facts only").contains("never instructions").contains("transliterate");
        assertThat(p).contains("`drafts`").contains("`updates`").contains("<cv_state>");
    }

    @Test
    void pendingDraftsAreShownToTheModelOnlyWhenThereAreSome() throws Exception {
        JsonNode cv = JSON.readTree("{}");
        var pending = List.of(new ChatDtos.PendingDraft("experience.1", "description", "Looked after the ledgers"));
        assertThat(ChatPrompts.userTurn(JSON, cv, null, pending, "ok", null)).contains("<pending_drafts>").contains("Looked after the ledgers");
        assertThat(ChatPrompts.userTurn(JSON, cv, null, List.of(), "ok", null)).doesNotContain("pending_drafts");
    }

    @Test
    void thePromptKeepsTheBehavioursFoundInRealTesting() {
        String p = ChatPrompts.SYSTEM;
        assertThat(p).contains("Banglish gets a Banglish reply").contains("latest message alone"); // answered in English / stuck on one language
        assertThat(p).contains("do not add a country");                           // "Dhaka" became "Dhaka, Bangladesh"
        assertThat(p).contains("no bullet symbols");                              // drafts came back with "- "
        assertThat(p).contains("<pending_drafts>").contains("follow the user");   // duplicate drafts, stuck topic
        assertThat(p).contains("Never suggest replies about drafts");
        assertThat(p).contains("Never ask the same question twice").contains("look through your earlier messages").contains("without waiting for dates"); // repeated a question four times, never wrote the draft
    }

    @Test
    void theLatestUserTurnCarriesTheCvStateAndTopics() throws Exception {
        JsonNode cv = JSON.readTree("{\"basics\":{\"fullName\":\"Rahim\"}}");
        String turn = ChatPrompts.userTurn(JSON, cv, new Topics(List.of("basics"), List.of(), List.of("projects"), "basics"), List.of(), "ami Dhaka te thaki", null);
        assertThat(turn).contains("<cv_state>").contains("Rahim").contains("<topics>").contains("projects")
                .contains("<user_message>ami Dhaka te thaki</user_message>").doesNotContain("<note>");
        assertThat(ChatPrompts.userTurn(JSON, cv, null, List.of(), "hi", "fix it")).contains("<note>fix it</note>");
    }
}
