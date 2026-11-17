package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Topics;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class DemoChatClientTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private final DemoChatClient demo = new DemoChatClient();

    private static JsonNode cv(String basics, String experienceValues) throws Exception {
        return JSON.readTree("{\"basics\":" + basics + ",\"sections\":[{\"ref\":\"experience\",\"type\":\"experience\",\"entries\":[{\"ref\":\"experience.1\",\"values\":" + experienceValues + "}]}]}");
    }

    private ModelTurn ask(JsonNode cv, List<Message> history, Topics topics) {
        return demo.complete(history, cv, topics, List.of(), null).turn();
    }

    @Test
    void opensByAskingForTheFirstEmptyField() throws Exception {
        ModelTurn t = ask(cv("{}", "{}"), List.of(new Message("user", "start")), null);
        assertThat(t.message()).contains("full name");
        assertThat(t.currentTopic()).isEqualTo("basics");
        assertThat(t.updates()).isEmpty();
    }

    @Test
    void putsTheAnswerIntoTheFieldItAskedAbout() throws Exception {
        ModelTurn t = ask(cv("{}", "{}"), List.of(new Message("user", "start"), new Message("assistant", "What is your full name?"), new Message("user", "Rahim Uddin")), null);
        assertThat(t.updates()).hasSize(1);
        assertThat(t.updates().get(0).action()).isEqualTo("set_basics");
        assertThat(t.updates().get(0).field()).isEqualTo("fullName");
        assertThat(t.updates().get(0).value()).isEqualTo("Rahim Uddin");
        assertThat(t.message()).contains("job title"); // moved on to the next field
    }

    @Test
    void skippingSkipsTheWholeTopicAndMovesOn() throws Exception {
        var history = List.of(new Message("user", "start"), new Message("assistant", "q"), new Message("user", "Skip"));
        ModelTurn t = ask(cv("{}", "{}"), history, null);
        assertThat(t.skippedTopics()).containsExactly("basics");
        assertThat(t.message()).contains("most recent job");
    }

    @Test
    void descriptiveAnswersBecomeADraftNotAnUpdate() throws Exception {
        JsonNode filled = cv("{\"fullName\":\"R\",\"headline\":\"H\",\"email\":\"e\",\"phone\":\"p\",\"location\":\"l\"}",
                "{\"role\":\"Clerk\",\"company\":\"Acme\",\"startDate\":\"2020\",\"endDate\":\"2022\"}");
        var history = new ArrayList<>(List.of(new Message("user", "start"), new Message("assistant", "q"), new Message("user", "I kept the ledgers. I trained two juniors.")));
        ModelTurn t = ask(filled, history, null);
        assertThat(t.updates()).isEmpty();
        assertThat(t.drafts()).hasSize(1);
        assertThat(t.drafts().get(0).entry()).isEqualTo("experience.1");
        assertThat(t.drafts().get(0).field()).isEqualTo("description");
        assertThat(t.drafts().get(0).text()).isEqualTo("I kept the ledgers.\nI trained two juniors.");
    }

    @Test
    void canAddASectionOnRequest() throws Exception {
        var history = List.of(new Message("user", "start"), new Message("assistant", "q"), new Message("user", "I also have a certificate"));
        ModelTurn t = ask(cv("{}", "{}"), history, null);
        assertThat(t.updates()).extracting(u -> u.action()).containsExactly("add_section");
    }

    @Test
    void finishesWhenNothingIsLeftToAsk() throws Exception {
        JsonNode done = JSON.readTree("{\"basics\":{\"fullName\":\"R\",\"headline\":\"H\",\"email\":\"e\",\"phone\":\"p\",\"location\":\"l\"},\"sections\":[]}");
        ModelTurn t = ask(done, List.of(new Message("user", "start")), new Topics(List.of("basics"), List.of(), List.of(), ""));
        assertThat(t.message()).contains("ready to review");
        assertThat(t.currentTopic()).isEmpty();
        assertThat(t.completedTopics()).contains("basics");
    }

    @Test
    void goingToATopicAsksItsQuestionAndDoesNotTreatTheRequestAsAnAnswer() throws Exception {
        var history = List.of(new Message("user", "start"), new Message("assistant", "q"), new Message("user", "Let's go to: Experience."));
        ModelTurn t = ask(cv("{}", "{}"), history, new Topics(List.of("basics", "experience"), List.of(), List.of("experience"), "experience"));
        assertThat(t.updates()).isEmpty();
        assertThat(t.message()).contains("most recent job");
        assertThat(t.currentTopic()).isEqualTo("experience");
        assertThat(t.skippedTopics()).doesNotContain("experience"); // going back un-skips it
    }

    @Test
    void isMarkedAsADemo() {
        assertThat(demo.demo()).isTrue();
        assertThat(demo.modelName()).isEqualTo("demo");
    }
}
