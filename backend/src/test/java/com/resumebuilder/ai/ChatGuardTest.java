package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.resumebuilder.ai.ChatDtos.DraftText;
import com.resumebuilder.ai.ChatDtos.KeyValue;
import com.resumebuilder.ai.ChatDtos.Message;
import com.resumebuilder.ai.ChatDtos.ModelTurn;
import com.resumebuilder.ai.ChatDtos.Update;

import tools.jackson.databind.json.JsonMapper;

class ChatGuardTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static Update update(String action) {
        return new Update(action, "", "", "fullName", "  Rahim  ", List.of());
    }

    private static ModelTurn turn(String message, List<Update> updates, List<DraftText> drafts) {
        return new ModelTurn(message, updates, drafts, "basics", List.of(), List.of(), List.of());
    }

    @Test
    void dropsUpdatesWithAnUnknownAction() {
        ModelTurn out = ChatGuard.sanitise(turn("Hi", List.of(update("set_basics"), update("delete_everything"), update("")), List.of()));
        assertThat(out.updates()).extracting(Update::action).containsExactly("set_basics");
    }

    @Test
    void trimsTextAndRemovesControlCharacters() {
        ModelTurn out = ChatGuard.sanitise(turn(" Hello\u0007 there ", List.of(update("set_basics")), List.of()));
        assertThat(out.message()).isEqualTo("Hello there");
        assertThat(out.updates().get(0).value()).isEqualTo("Rahim");
    }

    @Test
    void givesAPlainMessageWhenTheModelSendsNone() {
        assertThat(ChatGuard.sanitise(turn("   ", List.of(), List.of())).message()).isNotBlank();
    }

    @Test
    void capsSizes() {
        List<Update> many = java.util.stream.IntStream.range(0, 100).mapToObj(i -> update("set_basics")).toList();
        List<DraftText> drafts = java.util.stream.IntStream.range(0, 9)
                .mapToObj(i -> new DraftText("d" + i, "experience.1", "description", "text " + i)).toList();
        ModelTurn out = ChatGuard.sanitise(turn("x".repeat(5000), many, drafts));
        assertThat(out.message()).hasSize(ChatGuard.MAX_MESSAGE);
        assertThat(out.updates()).hasSize(ChatGuard.MAX_UPDATES);
        assertThat(out.drafts()).hasSize(ChatGuard.MAX_DRAFTS);
    }

    @Test
    void dropsDraftsWithNoTextOrTarget() {
        List<DraftText> drafts = List.of(
                new DraftText("d1", "experience.1", "description", ""),
                new DraftText("d2", "", "description", "Text"),
                new DraftText("", "experience.1", "description", "Real draft"));
        ModelTurn out = ChatGuard.sanitise(turn("Here", List.of(), drafts));
        assertThat(out.drafts()).hasSize(1);
        assertThat(out.drafts().get(0).id()).isEqualTo("d1");
    }

    @Test
    void keepsEntryValuesAndDropsEmptyFieldNames() {
        Update u = new Update("add_entry", "experience", "", "", "", List.of(new KeyValue("role", "Clerk"), new KeyValue("", "x")));
        assertThat(ChatGuard.sanitise(turn("ok", List.of(u), List.of())).updates().get(0).values()).hasSize(1);
    }

    @Test
    void removesBulletSymbolsDashesAndNumbersFromDraftLines() {
        assertThat(ChatGuard.plainLines("- Looked after ledgers\n• Trained two juniors\n1. Filed reports\n  * Checked invoices"))
                .isEqualTo("Looked after ledgers\nTrained two juniors\nFiled reports\nChecked invoices");
        assertThat(ChatGuard.plainLines("Kept the books\n\n\nPaid suppliers")).isEqualTo("Kept the books\nPaid suppliers");
        assertThat(ChatGuard.plainLines("2019 was a good year")).isEqualTo("2019 was a good year"); // not a list number
        assertThat(ChatGuard.plainLines("-- \n •")).isEmpty();
    }

    @Test
    void draftsAreCleanedAndAnEmptyOneIsDropped() {
        List<DraftText> drafts = List.of(
                new DraftText("d1", "experience.1", "description", "- Kept the ledgers\n- Trained two juniors"),
                new DraftText("d2", "experience.1", "description", " - \n"));
        ModelTurn out = ChatGuard.sanitise(turn("Here", List.of(), drafts));
        assertThat(out.drafts()).hasSize(1);
        assertThat(out.drafts().get(0).text()).isEqualTo("Kept the ledgers\nTrained two juniors");
    }

    // --- facts only ----------------------------------------------------------------------------

    @Test
    void findsNumbersTheUserNeverGave() {
        assertThat(ChatGuard.numbersNotIn("Led a team of 12 and cut costs by 40%.", "I led a team of 12 people")).containsExactly("40");
        assertThat(ChatGuard.numbersNotIn("Worked at Acme from 2019 to 2022.", "Acme 2019 2022")).isEmpty();
        assertThat(ChatGuard.numbersNotIn("No numbers here.", "")).isEmpty();
    }

    @Test
    void treatsBanglaDigitsAndThousandSeparatorsAsTheSameNumber() {
        assertThat(ChatGuard.numbersNotIn("Managed 3 years of accounts and ৳1,500", ChatGuard.asciiDigits("আমি ৩ বছর ১৫০০ টাকা"))).isEmpty();
        assertThat(ChatGuard.asciiDigits("২০২৩")).isEqualTo("2023");
    }

    @Test
    void theCorpusIsWhatTheUserSaidNotWhatTheAssistantSaid() throws Exception {
        var cv = JSON.readTree("{\"basics\":{\"phone\":\"01712345678\"},\"sections\":[{\"ref\":\"experience\",\"entries\":[{\"ref\":\"experience.1\",\"values\":{\"role\":\"Clerk\",\"company\":\"Acme 2020\"}}]}]}");
        String corpus = ChatGuard.corpus(List.of(new Message("assistant", "I think you made 99% savings"), new Message("user", "I worked 4 years")), cv);
        assertThat(ChatGuard.numbersNotIn("99", corpus)).containsExactly("99");
        assertThat(ChatGuard.numbersNotIn("4 years, 2020 and 01712345678", corpus)).isEmpty();
        // references like "experience.1" must not make the number 1 look like something the user said
        assertThat(ChatGuard.numbersNotIn("1", corpus)).containsExactly("1");
    }
}
