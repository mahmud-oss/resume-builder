package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.resumebuilder.ai.AtsDtos.AtsFileResponse;
import com.resumebuilder.ai.UploadDtos.Basics;
import com.resumebuilder.ai.UploadDtos.Extraction;
import com.resumebuilder.common.ApiException;

class AtsServiceTest {

    private static final UUID USER = UUID.randomUUID();

    private static byte[] docx(String text, boolean withTable) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry("word/document.xml"));
            String table = withTable ? "<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell</w:t></w:r></w:p></w:tc></w:tr></w:tbl>" : "";
            zip.write(("<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"
                    + "<w:p><w:r><w:t>" + text + "</w:t></w:r></w:p>" + table + "</w:body></w:document>")
                    .getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    private record Fixture(AtsService service, AiUsageRepository usage, CvExtractor extractor) {
    }

    private static Fixture fixture(boolean demo, int perDay) {
        CvExtractor extractor = Mockito.mock(CvExtractor.class);
        Mockito.when(extractor.demo()).thenReturn(demo);
        Mockito.when(extractor.modelName()).thenReturn("test-model");
        Extraction cv = new Extraction(new Basics("Rahim", "", "", "", "", "", ""), List.of(), "", List.of());
        Mockito.when(extractor.extract(Mockito.any())).thenReturn(new CvExtractor.Result(cv, ChatModelClient.Usage.NONE));
        AiUsageRepository usage = Mockito.mock(AiUsageRepository.class);
        return new Fixture(new AtsService(extractor, usage, perDay), usage, extractor);
    }

    private static ApiException rejected(Fixture f, byte[] bytes) {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> f.service().checkFile(USER, "cv.docx", bytes));
        assertThat(t).isInstanceOf(ApiException.class);
        return (ApiException) t;
    }

    @Test
    void returnsTheCvAndTheFindingsAboutTheFile() throws Exception {
        Fixture f = fixture(false, 0);
        AtsFileResponse r = f.service().checkFile(USER, "cv.docx", docx("Hello there", true));
        assertThat(r.cv().basics().fullName()).isEqualTo("Rahim");
        assertThat(r.findings()).extracting(AtsDtos.FileFinding::id).containsExactly("tables");
        assertThat(r.meta().kind()).isEqualTo("docx");
        assertThat(r.demo()).isFalse();
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("ats_file"), Mockito.eq("test-model"), Mockito.eq(false), Mockito.any());
    }

    @Test
    void refusesFilesTheUploadAlsoRefuses() throws Exception {
        Fixture f = fixture(false, 0);
        assertThat(rejected(f, "plain text".getBytes(StandardCharsets.UTF_8)).status().value()).isEqualTo(400);
        assertThat(rejected(f, new byte[0]).status().value()).isEqualTo(400);
        assertThat(rejected(f, new byte[UploadService.MAX_BYTES + 1]).status().value()).isEqualTo(413);
        Mockito.verifyNoInteractions(f.usage());
        Mockito.verify(f.extractor(), Mockito.never()).extract(Mockito.any());
    }

    @Test
    void aFailedReadIsRecordedAndReportedKindly() throws Exception {
        Fixture f = fixture(false, 0);
        Mockito.when(f.extractor().extract(Mockito.any()))
                .thenThrow(new ChatModelClient.ModelException(502, "We could not read that file. Please try again.", null));
        assertThat(rejected(f, docx("Hello", false)).status().value()).isEqualTo(502);
        Mockito.verify(f.usage()).record(Mockito.eq(USER), Mockito.eq("ats_file_failed"), Mockito.any(), Mockito.anyBoolean(), Mockito.any());
    }

    @Test
    void theDailyCapOnlyAppliesWhenSet() throws Exception {
        Fixture capped = fixture(false, 3);
        Mockito.when(capped.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.eq(List.of("ats_file", "ats_file_failed")))).thenReturn(3L);
        assertThat(rejected(capped, docx("Hello", false)).status().value()).isEqualTo(429);

        Fixture open = fixture(false, 0);
        Mockito.when(open.usage().countSince(Mockito.eq(USER), Mockito.any(), Mockito.anyList())).thenReturn(999L);
        assertThat(open.service().checkFile(USER, "cv.docx", docx("Hello", false))).isNotNull();
    }

    @Test
    void slowsDownAFastSequence() throws Exception {
        Fixture f = fixture(true, 0);
        byte[] file = docx("Hello", false);
        for (int i = 0; i < 6; i++) f.service().checkFile(USER, "cv.docx", file);
        assertThat(rejected(f, file).status().value()).isEqualTo(429);
    }
}
