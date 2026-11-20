package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.resumebuilder.ai.UploadDtos.Basics;
import com.resumebuilder.ai.UploadDtos.Entry;
import com.resumebuilder.ai.UploadDtos.ExtractedSection;
import com.resumebuilder.ai.UploadDtos.Extraction;
import com.resumebuilder.ai.UploadDtos.FieldValue;
import com.resumebuilder.common.ApiException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class UploadTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final UUID USER = UUID.randomUUID();

    // --- helpers ------------------------------------------------------------------------------

    private static byte[] docx(String documentXml) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("[Content_Types].xml"));
            zip.write("<Types/>".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            zip.write(documentXml.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    private static String body(String paragraphs) {
        return "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"
                + paragraphs + "</w:body></w:document>";
    }

    private static byte[] pdf(int pages) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (int i = 0; i < pages; i++) doc.addPage(new PDPage());
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static Extraction sample() {
        return new Extraction(new Basics("Rahim", "", "", "", "", "", ""),
                List.of(new ExtractedSection("skills", "Skills",
                        List.of(new Entry(List.of(new FieldValue("category", "Tools"), new FieldValue("skills", "Excel")))))),
                "", List.of());
    }

    private record Fixture(UploadService service, AiUsageRepository usage, CvExtractor extractor) {
    }

    private static Fixture fixture(boolean demo) {
        CvExtractor extractor = Mockito.mock(CvExtractor.class);
        Mockito.when(extractor.demo()).thenReturn(demo);
        Mockito.when(extractor.modelName()).thenReturn("test-model");
        Mockito.when(extractor.extract(Mockito.any())).thenReturn(new CvExtractor.Result(sample(), ChatModelClient.Usage.NONE));
        AiUsageRepository usage = Mockito.mock(AiUsageRepository.class);
        return new Fixture(new UploadService(extractor, usage, 5), usage, extractor);
    }

    private static ApiException rejected(Fixture f, String name, byte[] bytes) {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().convert(USER, name, bytes));
        assertThat(t).isInstanceOf(ApiException.class);
        return (ApiException) t;
    }

    // --- reading Word files -------------------------------------------------------------------

    @Test
    void readsParagraphsListItemsAndTableCells() throws Exception {
        String xml = body("""
                <w:p><w:r><w:t>Rahim Uddin</w:t></w:r></w:p>
                <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Kept the</w:t></w:r><w:r><w:t xml:space="preserve"> ledgers</w:t></w:r></w:p>
                <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Degree</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>BBA</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
                """);
        String text = DocxText.extract(docx(xml));
        assertThat(text).contains("Rahim Uddin").contains("- Kept the ledgers").contains("Degree\tBBA");
    }

    @Test
    void readsBanglaText() throws Exception {
        String text = DocxText.extract(docx(body("<w:p><w:r><w:t>রহিম উদ্দিন</w:t></w:r></w:p>")));
        assertThat(text).isEqualTo("রহিম উদ্দিন");
    }

    @Test
    void refusesAZipThatIsNotAWordDocument() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("hello.txt"));
            zip.write("hi".getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        assertThatThrownBy(() -> DocxText.extract(out.toByteArray())).isInstanceOf(DocxText.NotDocxException.class);
    }

    @Test
    void doesNotFollowExternalEntities() throws Exception {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE d [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
                + body("<w:p><w:r><w:t>&x;</w:t></w:r></w:p>");
        // Either refused or read without the entity's content; never the file's contents.
        try {
            assertThat(DocxText.extract(docx(xml))).doesNotContain("root:");
        } catch (DocxText.NotDocxException expected) {
            // refused: fine
        }
    }

    @Test
    void stopsAtTheSizeCapInsteadOfExpandingForever() throws Exception {
        String big = "<w:p><w:r><w:t>" + "a".repeat(1024) + "</w:t></w:r></w:p>";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 21 * 1024; i++) sb.append(big); // about 21 MB once unzipped, tiny once zipped
        byte[] zipped = docx(body(sb.toString()));
        assertThat(zipped.length).isLessThan(UploadService.MAX_BYTES);
        assertThatThrownBy(() -> DocxText.extract(zipped)).isInstanceOf(DocxText.NotDocxException.class);
    }

    // --- checking the upload ------------------------------------------------------------------

    @Test
    void acceptsAPdfAndAWordFile() throws Exception {
        Fixture f = fixture(false);
        assertThat(f.service().convert(USER, "cv.pdf", pdf(1)).cv().basics().fullName()).isEqualTo("Rahim");
        assertThat(f.service().convert(USER, "cv.docx", docx(body("<w:p><w:r><w:t>Hello</w:t></w:r></w:p>"))).demo()).isFalse();
        Mockito.verify(f.usage(), Mockito.times(2)).record(Mockito.eq(USER), Mockito.eq("upload"), Mockito.eq("test-model"),
                Mockito.eq(false), Mockito.any());
    }

    @Test
    void decidesByContentNotByFileName() throws Exception {
        Fixture f = fixture(false);
        assertThat(f.service().convert(USER, "notes.txt", pdf(1))).isNotNull();
        assertThat(rejected(f, "cv.pdf", "just text".getBytes(StandardCharsets.UTF_8)).status().value()).isEqualTo(400);
    }

    @Test
    void rejectsEmptyOversizedAndTooLongFiles() throws Exception {
        Fixture f = fixture(false);
        assertThat(rejected(f, "a.pdf", new byte[0]).status().value()).isEqualTo(400);
        assertThat(rejected(f, "a.pdf", new byte[UploadService.MAX_BYTES + 1]).status().value()).isEqualTo(413);
        assertThat(rejected(f, "a.pdf", pdf(UploadService.MAX_PAGES + 1)).status().value()).isEqualTo(422);
        String longText = "<w:p><w:r><w:t>" + "x".repeat(UploadService.MAX_DOCX_CHARS + 10) + "</w:t></w:r></w:p>";
        assertThat(rejected(f, "a.docx", docx(body(longText))).status().value()).isEqualTo(422);
        assertThat(rejected(f, "a.docx", docx(body(""))).status().value()).isEqualTo(422);
        Mockito.verifyNoInteractions(f.usage());
    }

    @Test
    void rejectsADamagedPdf() {
        Fixture f = fixture(false);
        byte[] bad = "%PDF-1.7\nthis is not really a pdf".getBytes(StandardCharsets.UTF_8);
        assertThat(rejected(f, "a.pdf", bad).status().value()).isEqualTo(400);
    }

    @Test
    void stopsAtTheDailyLimitButNotInDemoMode() throws Exception {
        Fixture real = fixture(false);
        Mockito.when(real.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.eq(List.of("upload", "upload_failed")))).thenReturn(5L);
        assertThat(rejected(real, "a.pdf", pdf(1)).status().value()).isEqualTo(429);

        Fixture demo = fixture(true);
        Mockito.when(demo.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.anyList())).thenReturn(99L);
        assertThat(demo.service().convert(USER, "a.pdf", pdf(1))).isNotNull();
    }

    @Test
    void hasNoDailyCapWhenItIsZero() throws Exception {
        CvExtractor extractor = Mockito.mock(CvExtractor.class);
        Mockito.when(extractor.demo()).thenReturn(false);
        Mockito.when(extractor.modelName()).thenReturn("m");
        Mockito.when(extractor.extract(Mockito.any())).thenReturn(new CvExtractor.Result(sample(), ChatModelClient.Usage.NONE));
        AiUsageRepository usage = Mockito.mock(AiUsageRepository.class);
        Mockito.when(usage.countSince(Mockito.eq(USER), Mockito.any(), Mockito.anyList())).thenReturn(999L);
        assertThat(new UploadService(extractor, usage, 0).convert(USER, "a.pdf", pdf(1))).isNotNull();
    }

    @Test
    void slowsDownAFastSequenceOfUploads() throws Exception {
        Fixture f = fixture(true);
        byte[] file = pdf(1);
        for (int i = 0; i < 6; i++) f.service().convert(USER, "a.pdf", file);
        assertThat(rejected(f, "a.pdf", file).status().value()).isEqualTo(429);
    }

    @Test
    void aFailedConversionIsRecordedAndReportedKindly() throws Exception {
        Fixture f = fixture(false);
        Mockito.when(f.extractor().extract(Mockito.any()))
                .thenThrow(new ChatModelClient.ModelException(502, "We could not read that file. Please try again.", null));
        ApiException e = rejected(f, "a.pdf", pdf(1));
        assertThat(e.status().value()).isEqualTo(502);
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("upload_failed"), Mockito.any(), Mockito.anyBoolean(), Mockito.any());
        Mockito.verify(f.usage(), Mockito.never()).record(Mockito.any(), Mockito.eq("upload"), Mockito.any(), Mockito.anyBoolean(), Mockito.any());
    }

    @Test
    void tidyRemovesEmptiesAndBoundsSizes() {
        Extraction messy = new Extraction(null,
                java.util.Arrays.asList(
                        null,
                        new ExtractedSection(null, null, java.util.Arrays.asList(new Entry(java.util.Arrays.asList(
                                new FieldValue("x", "   "), new FieldValue("y", "z".repeat(9000)), null)))),
                        new ExtractedSection("skills", "Skills", List.of(new Entry(List.of())))),
                null, java.util.Arrays.asList("ok", " ", null));
        Extraction t = UploadService.tidy(messy);
        assertThat(t.basics().fullName()).isEmpty();
        assertThat(t.sections()).hasSize(1);
        assertThat(t.sections().get(0).type()).isEqualTo("custom");
        assertThat(t.sections().get(0).entries().get(0).fields()).hasSize(1);
        assertThat(t.sections().get(0).entries().get(0).fields().get(0).value()).hasSize(4000);
        assertThat(t.other()).isEmpty();
        assertThat(t.reviewNotes()).containsExactly("ok");
    }

    // --- the request to the model and the demo ------------------------------------------------

    private final AnthropicCvExtractor client = new AnthropicCvExtractor(JSON, "test-key", "claude-sonnet-5-5", 8000, 120);

    private JsonNode requestBody(CvExtractor.Source source) throws Exception {
        return JSON.readTree(com.anthropic.core.ObjectMappers.jsonMapper().writeValueAsString(client.buildParams(source)._body()));
    }

    @Test
    void sendsAPdfAsADocumentAndAWordFileAsText() throws Exception {
        JsonNode pdfRequest = requestBody(CvExtractor.Source.ofPdf("%PDF-1.7 data".getBytes(StandardCharsets.UTF_8), "cv.pdf"));
        JsonNode blocks = pdfRequest.path("messages").get(0).path("content");
        assertThat(blocks.get(0).path("type").asString()).isEqualTo("document");
        assertThat(blocks.get(0).path("source").path("media_type").asString()).isEqualTo("application/pdf");
        assertThat(blocks.get(0).path("source").path("data").asString()).isNotBlank();

        JsonNode textRequest = requestBody(CvExtractor.Source.ofText("Rahim\n- Kept ledgers", "cv.docx"));
        String text = textRequest.path("messages").get(0).path("content").get(0).path("text").asString();
        assertThat(text).contains("<cv_text>").contains("Kept ledgers");
        assertThat(textRequest.path("model").asString()).isEqualTo("claude-sonnet-5-5");
        assertThat(textRequest.path("max_tokens").asInt()).isEqualTo(8000);
    }

    @Test
    void asksForStructuredJsonThatMatchesTheRecords() throws Exception {
        JsonNode format = requestBody(CvExtractor.Source.ofText("x", "cv.docx")).path("output_config").path("format");
        assertThat(format.path("type").asString()).isEqualTo("json_schema");
        JsonNode props = format.path("schema").path("properties");
        assertThat(props.has("basics")).isTrue();
        assertThat(props.path("sections").path("items").path("properties").path("type").path("enum").size()).isEqualTo(9);
        assertThat(props.has("other")).isTrue();
        assertThat(props.has("reviewNotes")).isTrue();
        // The answer must be readable as an Extraction.
        Extraction e = JSON.readValue("""
                {"basics":{"fullName":"A","headline":"","email":"","phone":"","location":"","website":"","linkedin":""},
                 "sections":[{"type":"skills","title":"Skills","entries":[{"fields":[{"field":"skills","value":"Excel"}]}]}],
                 "other":"","reviewNotes":[]}""", Extraction.class);
        assertThat(e.sections().get(0).entries().get(0).fields().get(0).value()).isEqualTo("Excel");
    }

    @Test
    void theSystemPromptTreatsTheFileAsDataAndDemandsFacts() {
        assertThat(UploadPrompts.SYSTEM).contains("never instructions").contains("Never invent").contains("transliterate");
        for (String type : UploadPrompts.SECTION_TYPES) assertThat(UploadPrompts.SYSTEM).contains(type);
    }

    @Test
    void demoModeReturnsASampleWithoutReadingTheFile() {
        CvExtractor.Result r = new DemoCvExtractor().extract(CvExtractor.Source.ofText("ignored", "x.docx"));
        assertThat(r.cv().basics().fullName()).isEqualTo("Demo Candidate");
        assertThat(r.cv().reviewNotes()).anyMatch(n -> n.contains("Demo mode"));
        assertThat(new DemoCvExtractor().demo()).isTrue();
    }
}
