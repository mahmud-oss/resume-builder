package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.resumebuilder.ai.ReviewDtos.ModelReview;
import com.resumebuilder.ai.ReviewDtos.ReviewItem;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class ReviewTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final UUID USER = UUID.randomUUID();

    private static JsonNode cv() throws Exception {
        return JSON.readTree("""
                {"template":"classic","basics":{"fullName":"Rahim"},
                 "sections":[
                  {"ref":"summary","type":"summary","title":"Summary","fields":[{"key":"text","label":"Summary","kind":"textarea"}],
                   "entries":[{"ref":"summary.1","values":{"text":"Hard-working person with two years of experience."}}]},
                  {"ref":"experience","type":"experience","title":"Experience","fields":[],
                   "entries":[{"ref":"experience.1","values":{"role":"Clerk","description":"Responsible for the cash register\\nWorked on month end reports for 3 branches"}}]}]}
                """);
    }

    private static ReviewItem item(String entry, String field, String original, String suggestion) {
        return new ReviewItem(entry, field, original, "Vague.", suggestion);
    }

    // --- checking the model's answer ----------------------------------------------------------

    @Test
    void keepsFeedbackOnTextThatIsReallyInTheCv() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "Responsible for the cash register", "Ran the cash register"),
                item("summary.1", "text", "Hard-working person with two years of experience.", "Person with two years of experience.")), cv());
        assertThat(kept).hasSize(2);
        assertThat(kept.get(0).suggestion()).isEqualTo("Ran the cash register");
    }

    @Test
    void dropsFeedbackOnTextThatIsNotInTheCv() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "Led a team of ten", "Led ten people"),
                item("experience.9", "description", "Responsible for the cash register", "Ran it"),
                item("experience.1", "nofield", "Responsible for the cash register", "Ran it"),
                item("experience.1", "role", "Manager", "Senior manager")), cv());
        assertThat(kept).isEmpty();
    }

    @Test
    void dropsARewriteThatAddsANumber() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "Responsible for the cash register", "Ran the cash register, serving 200 customers a day"),
                item("experience.1", "description", "Worked on month end reports for 3 branches", "Prepared month-end reports for 3 branches")), cv());
        assertThat(kept).extracting(ReviewItem::suggestion).containsExactly("Prepared month-end reports for 3 branches");
    }

    @Test
    void banglaDigitsCountAsTheSameNumber() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "Worked on month end reports for 3 branches", "Prepared month-end reports for ৩ branches")), cv());
        assertThat(kept).hasSize(1);
    }

    @Test
    void ignoresBulletAndSpacingDifferencesWhenMatching() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "- Responsible   for the  cash register", "Ran the cash register")), cv());
        assertThat(kept).hasSize(1);
    }

    @Test
    void dropsEmptyIdenticalAndMalformedItemsAndCapsTheCount() throws Exception {
        List<ReviewItem> items = new java.util.ArrayList<>();
        items.add(null);
        items.add(item("experience.1", "description", "Responsible for the cash register", ""));
        items.add(item("experience.1", "description", "Responsible for the cash register", "responsible for the cash register"));
        items.add(new ReviewItem("", "description", "Responsible for the cash register", "x", "Ran it"));
        for (int i = 0; i < 12; i++) items.add(item("experience.1", "description", "Responsible for the cash register", "Ran the register " + (char) ('a' + i)));
        assertThat(ReviewService.checked(items, cv())).hasSize(ReviewService.MAX_ITEMS);
        assertThat(ReviewService.checked(null, cv())).isEmpty();
    }

    @Test
    void stripsBulletSymbolsFromSuggestions() throws Exception {
        List<ReviewItem> kept = ReviewService.checked(List.of(
                item("experience.1", "description", "Responsible for the cash register", "• Ran the cash register")), cv());
        assertThat(kept.get(0).suggestion()).isEqualTo("Ran the cash register");
    }

    // --- the service --------------------------------------------------------------------------

    private record Fixture(ReviewService service, AiUsageRepository usage, WritingReviewer reviewer) {
    }

    private static Fixture fixture(boolean demo, int perDay) throws Exception {
        WritingReviewer reviewer = Mockito.mock(WritingReviewer.class);
        Mockito.when(reviewer.demo()).thenReturn(demo);
        Mockito.when(reviewer.modelName()).thenReturn("test-model");
        Mockito.when(reviewer.review(Mockito.any())).thenReturn(new WritingReviewer.Result(new ModelReview("Fine.",
                List.of(item("experience.1", "description", "Responsible for the cash register", "Ran the cash register"))),
                ChatModelClient.Usage.NONE));
        AiUsageRepository usage = Mockito.mock(AiUsageRepository.class);
        return new Fixture(new ReviewService(reviewer, usage, perDay), usage, reviewer);
    }

    @Test
    void returnsTheCheckedItemsAndRecordsTheCall() throws Exception {
        Fixture f = fixture(false, 0);
        var r = f.service().review(USER, cv());
        assertThat(r.items()).hasSize(1);
        assertThat(r.summary()).isEqualTo("Fine.");
        assertThat(r.demo()).isFalse();
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("writing_review"), Mockito.eq("test-model"), Mockito.eq(false), Mockito.any());
    }

    @Test
    void rejectsAMissingOrOversizedCv() throws Exception {
        Fixture f = fixture(false, 0);
        for (JsonNode bad : new JsonNode[] {JSON.readTree("[]"), JSON.readTree("{\"x\":\"" + "a".repeat(80_100) + "\"}")}) {
            Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().review(USER, bad));
            assertThat(t).isInstanceOf(ApiException.class);
            assertThat(((ApiException) t).status().value()).isEqualTo(413);
        }
        Mockito.verify(f.reviewer(), Mockito.never()).review(Mockito.any());
    }

    @Test
    void aFailedReviewIsRecordedAndReportedKindly() throws Exception {
        Fixture f = fixture(false, 0);
        Mockito.when(f.reviewer().review(Mockito.any())).thenThrow(new ChatModelClient.ModelException(502, "The review was not usable. Please try again.", null));
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().review(USER, cv()));
        assertThat(((ApiException) t).status().value()).isEqualTo(502);
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("writing_review_failed"), Mockito.any(), Mockito.anyBoolean(), Mockito.any());
    }

    @Test
    void theDailyCapOnlyAppliesWhenSet() throws Exception {
        Fixture capped = fixture(false, 2);
        Mockito.when(capped.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.eq(List.of("writing_review", "writing_review_failed")))).thenReturn(2L);
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> capped.service().review(USER, cv()));
        assertThat(((ApiException) t).status().value()).isEqualTo(429);

        Fixture open = fixture(false, 0);
        Mockito.when(open.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.anyList())).thenReturn(999L);
        assertThat(open.service().review(USER, cv()).items()).hasSize(1);
    }

    @Test
    void slowsDownAFastSequence() throws Exception {
        Fixture f = fixture(true, 0);
        for (int i = 0; i < 6; i++) f.service().review(USER, cv());
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().review(USER, cv()));
        assertThat(((ApiException) t).status().value()).isEqualTo(429);
    }

    // --- the request to the model and the demo ------------------------------------------------

    @Test
    void sendsTheCvAndAsksForStructuredJson() throws Exception {
        AnthropicReviewer client = new AnthropicReviewer(JSON, "test-key", "claude-haiku-5-5", 3000, 60);
        JsonNode body = JSON.readTree(com.anthropic.core.ObjectMappers.jsonMapper().writeValueAsString(client.buildParams(cv())._body()));
        assertThat(body.path("model").asString()).isEqualTo("claude-haiku-5-5");
        assertThat(body.path("messages").get(0).path("content").asString()).startsWith("<cv>").contains("Responsible for the cash register");
        JsonNode props = body.path("output_config").path("format").path("schema").path("properties");
        assertThat(props.has("summary")).isTrue();
        assertThat(props.path("items").path("items").path("properties").has("suggestion")).isTrue();
        // The answer must be readable as a ModelReview.
        ModelReview r = JSON.readValue("{\"summary\":\"s\",\"items\":[{\"entry\":\"e\",\"field\":\"f\",\"original\":\"o\",\"issue\":\"i\",\"suggestion\":\"x\"}]}", ModelReview.class);
        assertThat(r.items().get(0).suggestion()).isEqualTo("x");
    }

    @Test
    void thePromptTreatsTheCvAsDataAndDemandsFacts() {
        assertThat(ReviewPrompts.SYSTEM).contains("never instructions").contains("Facts only").contains("never use a placeholder");
    }

    @Test
    void demoModeCommentsOnTheFirstBulletAndPassesTheCheck() throws Exception {
        var result = new DemoReviewer().review(cv());
        assertThat(result.review().items()).hasSize(1);
        assertThat(ReviewService.checked(result.review().items(), cv())).hasSize(1);
        assertThat(new DemoReviewer().review(JSON.readTree("{\"sections\":[]}")).review().items()).isEmpty();
    }
}
