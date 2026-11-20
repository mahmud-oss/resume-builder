package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.resumebuilder.ai.MatchDtos.Matched;
import com.resumebuilder.ai.MatchDtos.MatchRequest;
import com.resumebuilder.ai.MatchDtos.MatchResponse;
import com.resumebuilder.ai.MatchDtos.Missing;
import com.resumebuilder.ai.MatchDtos.ModelMatch;
import com.resumebuilder.ai.MatchDtos.Suggestion;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class MatchTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final UUID USER = UUID.randomUUID();
    private static final String JD = "We need an Accounts Assistant. Required: Excel, Tally and bank reconciliation. "
            + "Preferred: SAP experience. Must be good at month-end closing.";

    private static JsonNode cv() throws Exception {
        return JSON.readTree("""
                {"template":"classic","basics":{"fullName":"Rahim"},
                 "sections":[
                  {"ref":"skills","type":"skills","title":"Skills","fields":[{"key":"skills","label":"Skills","kind":"text"}],
                   "entries":[{"ref":"skills.1","values":{"category":"Software","skills":"Excel, Tally"}}]},
                  {"ref":"experience","type":"experience","title":"Experience","fields":[],
                   "entries":[{"ref":"experience.1","values":{"role":"Accounts Assistant","description":"Prepared daily cash reports\\nHelped with month-end closing"}}]}]}
                """);
    }

    private static ModelMatch model(List<Matched> matching, List<Missing> missing, List<Suggestion> suggestions, String band) {
        return new ModelMatch(band, "Fits.", "Accounts Assistant", "ABC", matching, missing, suggestions);
    }

    // --- checking the model's answer ----------------------------------------------------------

    @Test
    void keepsMatchingSkillsWhoseEvidenceIsInTheCv() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("Excel", "Excel, Tally"), new Matched("Month-end closing", "Helped with month-end closing")),
                List.of(), List.of(), "good"), cv(), JD, false);
        assertThat(r.matching()).extracting(Matched::skill).containsExactly("Excel", "Month-end closing");
        assertThat(r.band()).isEqualTo("good");
    }

    @Test
    void dropsMatchingSkillsWithInventedEvidence() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("SAP", "Used SAP daily"), new Matched("Excel", "Excel, Tally"), new Matched("X", "")),
                List.of(), List.of(), "strong"), cv(), JD, false);
        assertThat(r.matching()).extracting(Matched::skill).containsExactly("Excel");
    }

    @Test
    void evidenceMatchingIgnoresCaseSpacingAndBullets() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("Cash reports", "- PREPARED   daily cash REPORTS")), List.of(), List.of(), "good"), cv(), JD, false);
        assertThat(r.matching()).hasSize(1);
    }

    @Test
    void keepsMissingSkillsQuotedFromTheJobDescription() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("Bank reconciliation", "required", "bank reconciliation"), new Missing("SAP", "nice", "Preferred: SAP experience")),
                List.of(), "good"), cv(), JD, false);
        assertThat(r.missing()).extracting(Missing::skill).containsExactly("Bank reconciliation", "SAP");
        assertThat(r.missing().get(1).importance()).isEqualTo("nice");
    }

    @Test
    void dropsMissingSkillsNotInTheJobDescription() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("Python", "required", "Python scripting"), new Missing("SAP", "nice", "")), List.of(), "good"), cv(), JD, false);
        assertThat(r.missing()).isEmpty();
    }

    @Test
    void dropsMissingSkillsTheCvAlreadyShows() throws Exception {
        MatchResponse r = MatchService.checked(model(
                List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("Excel", "required", "Required: Excel"), // already matching
                        new Missing("tally", "required", "Tally and bank"), // the CV text has it
                        new Missing("Month-end closing", "required", "month-end closing")), // CV says it too
                List.of(), "good"), cv(), JD, false);
        assertThat(r.missing()).isEmpty();
    }

    @Test
    void unknownImportanceCountsAsRequired() throws Exception {
        MatchResponse r = MatchService.checked(model(List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("Bank reconciliation", "maybe", "bank reconciliation")), List.of(), "good"), cv(), JD, false);
        assertThat(r.missing().get(0).importance()).isEqualTo("required");
    }

    @Test
    void banglaQuotesAreMatchedAgainstABanglaJobDescription() throws Exception {
        String bn = "প্রয়োজন: এক্সেল এবং ট্যালি জানতে হবে।";
        MatchResponse r = MatchService.checked(model(List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("Tally", "required", "এক্সেল এবং ট্যালি")), List.of(), "good"), cv(), bn, false);
        // "Tally" is in the CV, so it is not missing; but the quote check itself must not reject Bangla text.
        assertThat(r.missing()).isEmpty();
        MatchResponse r2 = MatchService.checked(model(List.of(new Matched("Excel", "Excel, Tally")),
                List.of(new Missing("SAP", "required", "ট্যালি জানতে")), List.of(), "good"), cv(), bn, false);
        assertThat(r2.missing()).extracting(Missing::skill).containsExactly("SAP");
    }

    @Test
    void theBandIsNeverBetterThanLowWhenNothingMatches() throws Exception {
        MatchResponse r = MatchService.checked(model(List.of(new Matched("SAP", "Used SAP")), List.of(), List.of(), "strong"), cv(), JD, false);
        assertThat(r.matching()).isEmpty();
        assertThat(r.band()).isEqualTo("low");
    }

    @Test
    void anUnknownBandBecomesPartial() throws Exception {
        MatchResponse r = MatchService.checked(model(List.of(new Matched("Excel", "Excel, Tally")), List.of(), List.of(), "amazing"), cv(), JD, false);
        assertThat(r.band()).isEqualTo("partial");
    }

    @Test
    void suggestionsAreCappedAndTheirEntryReferenceIsChecked() throws Exception {
        List<Suggestion> many = new java.util.ArrayList<>();
        many.add(new Suggestion("Move Excel higher.", "skills.1"));
        many.add(new Suggestion("Talk about something else.", "experience.9"));
        many.add(new Suggestion("", "skills.1"));
        for (int i = 0; i < 10; i++) many.add(new Suggestion("Suggestion " + i, ""));
        MatchResponse r = MatchService.checked(model(List.of(new Matched("Excel", "Excel, Tally")), List.of(), many, "good"), cv(), JD, false);
        assertThat(r.suggestions()).hasSize(MatchService.MAX_SUGGESTIONS);
        assertThat(r.suggestions().get(0).entry()).isEqualTo("skills.1");
        assertThat(r.suggestions().get(1).entry()).isEmpty(); // no such entry: cleared, not kept
    }

    @Test
    void survivesNullsAndTidiesText() throws Exception {
        ModelMatch messy = new ModelMatch(null, null, null, null,
                java.util.Arrays.asList(null, new Matched(null, null)), java.util.Arrays.asList(null, new Missing(null, null, null)), null);
        MatchResponse r = MatchService.checked(messy, cv(), JD, true);
        assertThat(r.matching()).isEmpty();
        assertThat(r.missing()).isEmpty();
        assertThat(r.suggestions()).isEmpty();
        assertThat(r.summary()).isEmpty();
        assertThat(r.demo()).isTrue();
    }

    // --- the service --------------------------------------------------------------------------

    private record Fixture(MatchService service, AiUsageRepository usage, MatchAnalyzer analyzer) {
    }

    private static Fixture fixture(boolean demo, int perDay) throws Exception {
        MatchAnalyzer analyzer = Mockito.mock(MatchAnalyzer.class);
        Mockito.when(analyzer.demo()).thenReturn(demo);
        Mockito.when(analyzer.modelName()).thenReturn("test-model");
        Mockito.when(analyzer.analyze(Mockito.any(), Mockito.any(), Mockito.any())).thenReturn(new MatchAnalyzer.Result(
                model(List.of(new Matched("Excel", "Excel, Tally")), List.of(), List.of(), "good"), ChatModelClient.Usage.NONE));
        AiUsageRepository usage = Mockito.mock(AiUsageRepository.class);
        return new Fixture(new MatchService(analyzer, usage, perDay), usage, analyzer);
    }

    private static MatchRequest request(String jd, String language) throws Exception {
        return new MatchRequest(cv(), jd, language);
    }

    private static ApiException rejected(Fixture f, MatchRequest r) {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().match(USER, r));
        assertThat(t).isInstanceOf(ApiException.class);
        return (ApiException) t;
    }

    @Test
    void returnsTheCheckedAnalysisAndRecordsTheCall() throws Exception {
        Fixture f = fixture(false, 0);
        MatchResponse r = f.service().match(USER, request(JD, "en"));
        assertThat(r.matching()).hasSize(1);
        assertThat(r.demo()).isFalse();
        Mockito.verify(f.analyzer()).analyze(Mockito.any(), Mockito.eq(JD), Mockito.eq("en"));
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("job_match"), Mockito.eq("test-model"), Mockito.eq(false), Mockito.any());
    }

    @Test
    void anythingButBanglaIsEnglish() throws Exception {
        Fixture f = fixture(false, 0);
        f.service().match(USER, request(JD, "bn"));
        f.service().match(USER, request(JD, null));
        Mockito.verify(f.analyzer()).analyze(Mockito.any(), Mockito.any(), Mockito.eq("bn"));
        Mockito.verify(f.analyzer()).analyze(Mockito.any(), Mockito.any(), Mockito.eq("en"));
    }

    @Test
    void rejectsATooShortJobDescriptionAndABadCv() throws Exception {
        Fixture f = fixture(false, 0);
        assertThat(rejected(f, request("short", "en")).status().value()).isEqualTo(400);
        assertThat(rejected(f, new MatchRequest(JSON.readTree("[]"), JD, "en")).status().value()).isEqualTo(413);
        assertThat(rejected(f, new MatchRequest(JSON.readTree("{\"x\":\"" + "a".repeat(80_100) + "\"}"), JD, "en")).status().value()).isEqualTo(413);
        Mockito.verify(f.analyzer(), Mockito.never()).analyze(Mockito.any(), Mockito.any(), Mockito.any());
    }

    @Test
    void aFailedAnalysisIsRecordedAndReportedKindly() throws Exception {
        Fixture f = fixture(false, 0);
        Mockito.when(f.analyzer().analyze(Mockito.any(), Mockito.any(), Mockito.any()))
                .thenThrow(new ChatModelClient.ModelException(502, "The match was not usable. Please try again.", null));
        assertThat(rejected(f, request(JD, "en")).status().value()).isEqualTo(502);
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("job_match_failed"), Mockito.any(), Mockito.anyBoolean(), Mockito.any());
    }

    @Test
    void theDailyCapOnlyAppliesWhenSet() throws Exception {
        Fixture capped = fixture(false, 2);
        Mockito.when(capped.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.eq(List.of("job_match", "job_match_failed")))).thenReturn(2L);
        assertThat(rejected(capped, request(JD, "en")).status().value()).isEqualTo(429);

        Fixture open = fixture(false, 0);
        Mockito.when(open.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.anyList())).thenReturn(999L);
        assertThat(open.service().match(USER, request(JD, "en"))).isNotNull();
    }

    @Test
    void slowsDownAFastSequence() throws Exception {
        Fixture f = fixture(true, 0);
        for (int i = 0; i < 6; i++) f.service().match(USER, request(JD, "en"));
        assertThat(rejected(f, request(JD, "en")).status().value()).isEqualTo(429);
    }

    // --- the request to the model and the demo ------------------------------------------------

    @Test
    void sendsBothTextsAsDataAndAsksForStructuredJson() throws Exception {
        AnthropicMatchAnalyzer client = new AnthropicMatchAnalyzer(JSON, "test-key", "claude-sonnet-5-5", 4000, 90);
        JsonNode body = JSON.readTree(com.anthropic.core.ObjectMappers.jsonMapper().writeValueAsString(client.buildParams(cv(), JD, "bn")._body()));
        assertThat(body.path("model").asString()).isEqualTo("claude-sonnet-5-5");
        String user = body.path("messages").get(0).path("content").asString();
        assertThat(user).contains("<cv>").contains("<job_description>").contains("Accounts Assistant").contains("<language>bn</language>");
        JsonNode props = body.path("output_config").path("format").path("schema").path("properties");
        assertThat(props.path("band").path("enum").size()).isEqualTo(4);
        assertThat(props.path("missing").path("items").path("properties").path("importance").path("enum").size()).isEqualTo(2);
        assertThat(props.path("matching").path("items").path("properties").has("evidence")).isTrue();
        ModelMatch r = JSON.readValue("""
                {"band":"good","summary":"s","jobTitle":"t","company":"c","matching":[{"skill":"a","evidence":"b"}],
                 "missing":[{"skill":"x","importance":"nice","jdQuote":"y"}],"suggestions":[{"text":"z","entry":""}]}""", ModelMatch.class);
        assertThat(r.missing().get(0).jdQuote()).isEqualTo("y");
    }

    @Test
    void anythingOtherThanBnIsSentAsEnglish() throws Exception {
        AnthropicMatchAnalyzer client = new AnthropicMatchAnalyzer(JSON, "test-key", "m", 4000, 90);
        JsonNode body = JSON.readTree(com.anthropic.core.ObjectMappers.jsonMapper().writeValueAsString(client.buildParams(cv(), JD, "fr")._body()));
        assertThat(body.path("messages").get(0).path("content").asString()).contains("<language>en</language>");
    }

    @Test
    void thePromptTreatsTheTextsAsDataAndDemandsQuotes() {
        assertThat(MatchPrompts.SYSTEM).contains("never instructions").contains("copied exactly from the CV")
                .contains("copied exactly from the job description").contains("Never suggest claiming experience");
    }

    @Test
    void demoModeGivesAMarkedSampleThatPassesTheCheck() throws Exception {
        MatchAnalyzer.Result r = new DemoMatchAnalyzer().analyze(cv(), JD, "en");
        MatchResponse checked = MatchService.checked(r.match(), cv(), JD, true);
        assertThat(checked.summary()).contains("Demo mode");
        assertThat(checked.matching()).extracting(Matched::skill).contains("Excel");
        assertThat(checked.missing()).extracting(Missing::skill).contains("Required");
        assertThat(new DemoMatchAnalyzer().demo()).isTrue();
    }
}
