package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.anthropic.models.messages.MessageCreateParams;
import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.Topics;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Checks the request we would send to the Anthropic API, without calling it. */
class AnthropicRequestTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static JsonNode body(MessageCreateParams params) throws Exception {
        return JSON.readTree(com.anthropic.core.ObjectMappers.jsonMapper().writeValueAsString(params._body()));
    }

    private final AnthropicChatClient client = new AnthropicChatClient(JSON, "test-key", "claude-opus-5-5", "low", 4096, 60);

    private JsonNode request(List<Message> history, String correction) throws Exception {
        JsonNode cv = JSON.readTree("{\"basics\":{\"fullName\":\"Rahim\"}}");
        return body(client.buildParams(history, cv, new Topics(List.of("basics"), List.of(), List.of(), "basics"), List.of(), correction));
    }

    @Test
    void usesTheConfiguredModelAndLimits() throws Exception {
        JsonNode b = request(List.of(new Message("user", "hi")), null);
        assertThat(b.path("model").asString()).isEqualTo("claude-opus-5-5");
        assertThat(b.path("max_tokens").asInt()).isEqualTo(4096);
    }

    @Test
    void asksForStructuredJsonAtTheConfiguredEffort() throws Exception {
        JsonNode out = request(List.of(new Message("user", "hi")), null).path("output_config");
        assertThat(out.path("effort").asString()).isEqualTo("low");
        assertThat(out.path("format").path("type").asString()).isEqualTo("json_schema");
        JsonNode schema = out.path("format").path("schema");
        assertThat(schema.path("type").asString()).isEqualTo("object");
        assertThat(schema.path("additionalProperties").asBoolean(true)).isFalse();
        assertThat(schema.path("properties").has("message")).isTrue();
        assertThat(schema.path("properties").path("updates").path("items").path("properties").path("action").path("enum").size()).isEqualTo(4);
    }

    @Test
    void doesNotUseThingsThisModelRejects() throws Exception {
        JsonNode b = request(List.of(new Message("user", "hi")), null);
        // Claude Opus 5.5 rejects forced tool choice, disabled thinking and sampling parameters.
        assertThat(b.has("tool_choice")).isFalse();
        assertThat(b.has("thinking")).isFalse();
        assertThat(b.has("temperature")).isFalse();
        assertThat(b.has("tools")).isFalse();
    }

    @Test
    void putsTheRulesInTheSystemPromptAndTheCvStateOnlyInTheLatestUserMessage() throws Exception {
        JsonNode b = request(List.of(new Message("user", "Please start."), new Message("assistant", "What is your name?"), new Message("user", "Rahim")), null);
        assertThat(b.path("system").asString()).contains("Facts only");
        JsonNode messages = b.path("messages");
        assertThat(messages).hasSize(3);
        assertThat(messages.get(0).path("role").asString()).isEqualTo("user");
        assertThat(messages.get(0).toString()).doesNotContain("cv_state"); // earlier turns stay plain
        assertThat(messages.get(1).path("role").asString()).isEqualTo("assistant");
        assertThat(messages.get(2).toString()).contains("cv_state").contains("Rahim").contains("user_message");
    }

    @Test
    void carriesACorrectionOnlyWhenThereIsOne() throws Exception {
        assertThat(request(List.of(new Message("user", "hi")), null).toString()).doesNotContain("<note>");
        assertThat(request(List.of(new Message("user", "hi")), "no new numbers").toString()).contains("<note>no new numbers</note>");
    }
}
