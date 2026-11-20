package com.resumebuilder.ai;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import com.resumebuilder.ai.AtsDtos.FileFinding;
import com.resumebuilder.ai.AtsDtos.FileReport;

class FileChecksTest {

    // --- PDF helpers --------------------------------------------------------------------------

    /** One entry per line: {x, y, text}; text is drawn at that spot on a single page. */
    private static byte[] pdf(List<Object[]> lines) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                for (Object[] l : lines) {
                    cs.beginText();
                    cs.setFont(font, 10);
                    cs.newLineAtOffset((float) l[0], (float) l[1]);
                    cs.showText((String) l[2]);
                    cs.endText();
                }
            }
            doc.save(out);
            return out.toByteArray();
        }
    }

    private static List<String> ids(FileReport r) {
        return r.findings().stream().map(FileFinding::id).toList();
    }

    private static String severity(FileReport r, String id) {
        return r.findings().stream().filter(f -> f.id().equals(id)).findFirst().orElseThrow().severity();
    }

    private static List<Object[]> singleColumn() {
        List<Object[]> lines = new java.util.ArrayList<>();
        for (int i = 0; i < 12; i++) {
            lines.add(new Object[] {50f, 760f - i * 16, "Prepared the daily cash report and reconciled the bank statements"});
            // A right-aligned date range on the same line, as most CVs have.
            lines.add(new Object[] {430f, 760f - i * 16, "Jan 2021 - Present"});
        }
        return lines;
    }

    // --- PDF ----------------------------------------------------------------------------------

    @Test
    void aPlainSingleColumnPdfIsClean_evenWithRightAlignedDates() throws Exception {
        FileReport r = FileChecks.pdf(pdf(singleColumn()));
        assertThat(ids(r)).isEmpty();
        assertThat(r.meta().kind()).isEqualTo("pdf");
        assertThat(r.meta().pages()).isEqualTo(1);
        assertThat(r.meta().words()).isGreaterThan(100);
    }

    @Test
    void aPdfWithNoTextIsCritical() throws Exception {
        FileReport r = FileChecks.pdf(pdf(List.of()));
        assertThat(ids(r)).containsExactly("no-text");
        assertThat(severity(r, "no-text")).isEqualTo("critical");
    }

    @Test
    void twoColumnsAreFlaggedAsAWarning() throws Exception {
        List<Object[]> lines = new java.util.ArrayList<>();
        for (int i = 0; i < 10; i++) {
            lines.add(new Object[] {40f, 760f - i * 16, "Programming languages and tools used"});
            lines.add(new Object[] {320f, 760f - i * 16, "Worked with the finance team daily"});
        }
        FileReport r = FileChecks.pdf(pdf(lines));
        assertThat(ids(r)).contains("columns-or-tables");
        assertThat(severity(r, "columns-or-tables")).isEqualTo("warning");
    }

    @Test
    void datesAreNotMistakenForColumns() {
        assertThat(FileChecks.dateLike("Jan 2021 - Present")).isTrue();
        assertThat(FileChecks.dateLike("September 2019 – December 2022")).isTrue();
        assertThat(FileChecks.dateLike("2018/2022")).isTrue();
        assertThat(FileChecks.dateLike("Accounts Assistant")).isFalse();
        assertThat(FileChecks.dateLike("Excel and Tally")).isFalse();
    }

    @Test
    void countsOnlyLinesWithTwoRealBlocks() {
        var words = List.of(
                new FileChecks.Word(1, 40, 200, 700, "Programming languages"),
                new FileChecks.Word(1, 320, 480, 700, "Worked with finance"),
                new FileChecks.Word(1, 40, 200, 680, "Accounts Assistant here"),
                new FileChecks.Word(1, 430, 500, 680, "Jan 2021 - Present"));
        assertThat(FileChecks.linesWithTwoParts(words)).isEqualTo(1);
    }

    // --- DOCX ---------------------------------------------------------------------------------

    private static byte[] docx(String body, String header, String app) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        String ns = "xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" "
                + "xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"";
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            put(zip, "word/document.xml", "<w:document " + ns + "><w:body>" + body + "</w:body></w:document>");
            if (header != null) put(zip, "word/header1.xml", "<w:hdr " + ns + ">" + header + "</w:hdr>");
            if (app != null) put(zip, "docProps/app.xml", app);
        }
        return out.toByteArray();
    }

    private static void put(ZipOutputStream zip, String name, String xml) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(xml.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static final String PARA = "<w:p><w:r><w:t>Hello world</w:t></w:r></w:p>";

    @Test
    void aPlainWordDocumentIsClean() throws Exception {
        FileReport r = FileChecks.docx(docx(PARA, null, "<Properties><Pages>2</Pages></Properties>"), "Hello world");
        assertThat(ids(r)).isEmpty();
        assertThat(r.meta().kind()).isEqualTo("docx");
        assertThat(r.meta().pages()).isEqualTo(2);
        assertThat(r.meta().words()).isEqualTo(2);
    }

    @Test
    void reportsTablesTextBoxesColumnsAndPictures() throws Exception {
        String body = PARA
                + "<w:tbl><w:tr><w:tc>" + PARA + "</w:tc></w:tr></w:tbl>"
                + "<w:p><w:r><w:pict><w:txbxContent>" + PARA + "</w:txbxContent></w:pict></w:r></w:p>"
                + "<w:p><w:r><w:drawing><pic:pic/></w:drawing></w:r></w:p>"
                + "<w:sectPr><w:cols w:num=\"2\"/></w:sectPr>";
        FileReport r = FileChecks.docx(docx(body, null, null), "x");
        assertThat(ids(r)).containsExactlyInAnyOrder("tables", "text-boxes", "columns", "images");
        assertThat(severity(r, "images")).isEqualTo("note");
        assertThat(severity(r, "tables")).isEqualTo("warning");
        assertThat(r.meta().pages()).isNull();
    }

    @Test
    void aSingleColumnSectionIsNotColumns() throws Exception {
        FileReport r = FileChecks.docx(docx(PARA + "<w:sectPr><w:cols w:num=\"1\"/></w:sectPr>", null, null), "x");
        assertThat(ids(r)).isEmpty();
    }

    @Test
    void flagsContactDetailsInTheHeader() throws Exception {
        String header = "<w:p><w:r><w:t>rahim@example.com</w:t></w:r></w:p>";
        assertThat(ids(FileChecks.docx(docx(PARA, header, null), "x"))).containsExactly("header-footer-contact");
        String phone = "<w:p><w:r><w:t>Phone: 01711 000 000</w:t></w:r></w:p>";
        assertThat(ids(FileChecks.docx(docx(PARA, phone, null), "x"))).containsExactly("header-footer-contact");
        String page = "<w:p><w:r><w:t>Page 1 of 2</w:t></w:r></w:p>";
        assertThat(ids(FileChecks.docx(docx(PARA, page, null), "x"))).isEmpty();
    }

    @Test
    void doesNotFollowExternalEntities() throws Exception {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE d [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
                + "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body>"
                + "<w:p><w:r><w:t>&x;</w:t></w:r></w:p></w:body></w:document>";
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            put(zip, "word/document.xml", xml);
        }
        // Must not throw and must not read the file; the document simply has fewer findings.
        FileReport r = FileChecks.docx(out.toByteArray(), "");
        assertThat(r.findings()).isEmpty();
    }
}
