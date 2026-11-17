package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.resumebuilder.ai.ChatDtos.ChatRequest;
import com.resumebuilder.ai.ChatDtos.ChatResponse;
import com.resumebuilder.ai.ChatDtos.DraftText;
import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Topics;
import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Result;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ChatServiceTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final UUID USER = UUID.randomUUID();

    /** Records usage in memory instead of the database. */
    static class MemoryUsage extends AiUsageRepository {
        final List<String> rows = new ArrayList<>();
        long today = 0;

        MemoryUsage() {
            super(null);
        }

        @Override
        void record(UUID userId, String action, String model, boolean demo, Usage usage) {
            rows.add(action + ":" + model + ":" + usage.inputTokens() + "/" + usage.outputTokens());
        }

        @Override
        long countSince(UUID userId, Instant since) {
            return today;
        }
    }

    /** Replies with a queue of scripted turns and remembers the corrections it was given. */
    static class Scripted implements ChatModelClient {
        final List<ModelTurn> replies;
        final List<String> corrections = new ArrayList<>();
        final boolean demo;
        int calls = 0;

        Scripted(boolean demo, ModelTurn... replies) {
            this.demo = demo;
            this.replies = new ArrayList<>(List.of(replies));
        }

        @Override
        public Result complete(List<Message> history, JsonNode cv, Topics topics, List<ChatDtos.PendingDraft> pending, String correction) {
            corrections.add(correction);
            calls++;
            return new Result(replies.remove(0), new Usage(100, 20, 0));
        }

        @Override
        public boolean demo() {
            return demo;
        }

        @Override
        public String modelName() {
            return "test-model";
        }
    }

    private static ModelTurn draftTurn(String text) {
        return new ModelTurn("Here is a draft", List.of(), List.of(new DraftText("d1", "experience.1", "description", text)),
                "experience", List.of(), List.of(), List.of());
    }

    private static ChatRequest request(String userSays) throws Exception {
        return new ChatRequest(List.of(new Message("user", userSays)), JSON.readTree("{\"basics\":{}}"), null, null);
    }

    private ChatService service(ChatModelClient client, MemoryUsage usage) {
        return new ChatService(client, usage, 12, 400);
    }

    @Test
    void returnsTheTurnAndRecordsUsage() throws Exception {
        MemoryUsage usage = new MemoryUsage();
        Scripted model = new Scripted(false, new ModelTurn("Hello", List.of(), List.of(), "basics", List.of(), List.of(), List.of("Yes")));
        ChatResponse r = service(model, usage).chat(USER, request("hi"));
        assertThat(r.message()).isEqualTo("Hello");
        assertThat(r.suggestedReplies()).containsExactly("Yes");
        assertThat(r.demo()).isFalse();
        assertThat(usage.rows).containsExactly("chat:test-model:100/20");
    }

    @Test
    void aDraftWithOnlyTheUsersNumbersPassesWithoutARetry() throws Exception {
        Scripted model = new Scripted(false, draftTurn("Managed accounts for 3 years."));
        ChatResponse r = service(model, new MemoryUsage()).chat(USER, request("I managed accounts for 3 years"));
        assertThat(model.calls).isEqualTo(1);
        assertThat(r.drafts().get(0).warnings()).isEmpty();
    }

    @Test
    void aDraftWithAnInventedNumberIsRetriedOnceWithACorrection() throws Exception {
        Scripted model = new Scripted(false, draftTurn("Cut costs by 40%."), draftTurn("Helped reduce costs."));
        ChatResponse r = service(model, new MemoryUsage()).chat(USER, request("I helped reduce costs"));
        assertThat(model.calls).isEqualTo(2);
        assertThat(model.corrections.get(0)).isNull();
        assertThat(model.corrections.get(1)).contains("40").contains("no new numbers");
        assertThat(r.drafts().get(0).text()).isEqualTo("Helped reduce costs.");
        assertThat(r.drafts().get(0).warnings()).isEmpty();
    }

    @Test
    void ifTheRetryStillInventsANumberTheDraftIsKeptButFlagged() throws Exception {
        MemoryUsage usage = new MemoryUsage();
        Scripted model = new Scripted(false, draftTurn("Cut costs by 40%."), draftTurn("Cut costs by 55%."));
        ChatResponse r = service(model, usage).chat(USER, request("I helped reduce costs"));
        assertThat(model.calls).isEqualTo(2);
        assertThat(r.drafts().get(0).warnings()).singleElement().asString().contains("55");
        assertThat(usage.rows).containsExactly("chat:test-model:200/40"); // both attempts are counted
    }

    @Test
    void theDemoIsNeverRetried() throws Exception {
        Scripted model = new Scripted(true, draftTurn("Cut costs by 40%."));
        service(model, new MemoryUsage()).chat(USER, request("hello"));
        assertThat(model.calls).isEqualTo(1);
    }

    @Test
    void refusesWhenTheLastMessageIsNotFromTheUser() throws Exception {
        ChatRequest bad = new ChatRequest(List.of(new Message("user", "hi"), new Message("assistant", "hello")), JSON.readTree("{}"), null, null);
        assertThatThrownBy(() -> service(new Scripted(false), new MemoryUsage()).chat(USER, bad))
                .isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).status().value()).isEqualTo(400);
    }

    @Test
    void refusesAnOversizedCv() throws Exception {
        String big = "{\"basics\":{\"x\":\"" + "a".repeat(90_000) + "\"}}";
        ChatRequest huge = new ChatRequest(List.of(new Message("user", "hi")), JSON.readTree(big), null, null);
        assertThatThrownBy(() -> service(new Scripted(false), new MemoryUsage()).chat(USER, huge))
                .isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).status().value()).isEqualTo(413);
    }

    @Test
    void stopsAUserWhoAsksTooFast() throws Exception {
        Scripted model = new Scripted(false, draftTurn("ok"), draftTurn("ok"), draftTurn("ok"));
        ChatService s = new ChatService(model, new MemoryUsage(), 2, 400);
        s.chat(USER, request("one"));
        s.chat(USER, request("two"));
        assertThatThrownBy(() -> s.chat(USER, request("three"))).isInstanceOf(ApiException.class)
                .extracting(e -> ((ApiException) e).status().value()).isEqualTo(429);
    }

    @Test
    void stopsAtTheDailyLimitForTheRealModelButNotForTheDemo() throws Exception {
        MemoryUsage usage = new MemoryUsage();
        usage.today = 400;
        assertThatThrownBy(() -> service(new Scripted(false, draftTurn("ok")), usage).chat(USER, request("hi")))
                .isInstanceOf(ApiException.class).extracting(e -> ((ApiException) e).status().value()).isEqualTo(429);
        assertThat(service(new Scripted(true, draftTurn("ok")), usage).chat(USER, request("hi")).demo()).isTrue();
    }

    @Test
    void turnsAModelFailureIntoAReadableHttpError() throws Exception {
        ChatModelClient failing = new ChatModelClient() {
            public Result complete(List<Message> h, JsonNode cv, Topics t, List<ChatDtos.PendingDraft> p, String c) {
                throw new ModelException(429, "The AI service is busy right now.", null);
            }
            public boolean demo() { return false; }
            public String modelName() { return "m"; }
        };
        assertThatThrownBy(() -> service(failing, new MemoryUsage()).chat(USER, request("hi")))
                .isInstanceOf(ApiException.class).hasMessage("The AI service is busy right now.")
                .extracting(e -> ((ApiException) e).status().value()).isEqualTo(429);
    }
}
