package com.resumebuilder.ai;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

import com.resumebuilder.ai.AtsDtos.FileFinding;
import com.resumebuilder.ai.AtsDtos.FileMeta;
import com.resumebuilder.ai.AtsDtos.FileReport;

/**
 * Looks at an uploaded file the way an applicant tracking system does: can the text be read at all, and does
 * the layout (columns, tables, text boxes, details hidden in a header) tend to confuse parsers. These are
 * heuristics, not a real ATS: they say "may", and the page tells the user so. No AI is involved.
 */
final class FileChecks {

    private FileChecks() {
    }

    private static final int MAX_ENTRIES = 500;
    private static final int MAX_PART_BYTES = 20 * 1024 * 1024;

    /** Less than this much text per page and the PDF is treated as a scan or a picture. */
    static final int MIN_CHARS_PER_PAGE = 40;
    /** A gap wider than this (in points) between two words is a column gutter or a table cell border, not a space. */
    static final float GUTTER = 14f;
    /** Both sides of a gap must be at least this long (and not just a date), so a right-aligned date is not a column. */
    static final int SUBSTANTIAL = 15;
    /** How many lines with two substantial parts it takes to suspect columns or a table. */
    static final int COLUMN_LINES = 5;

    private static FileFinding critical(String id, String title, String detail) {
        return new FileFinding(id, "critical", title, detail);
    }

    private static FileFinding warning(String id, String title, String detail) {
        return new FileFinding(id, "warning", title, detail);
    }

    private static FileFinding note(String id, String title, String detail) {
        return new FileFinding(id, "note", title, detail);
    }

    // --- PDF ------------------------------------------------------------------------------------

    /** One word with where it sits on its page. */
    record Word(int page, float x, float end, float y, String text) {
    }

    private static final class Collector extends PDFTextStripper {
        final List<Word> words = new ArrayList<>();
        int chars;

        Collector() throws IOException {
            setSortByPosition(true);
        }

        @Override
        protected void writeString(String text, List<TextPosition> positions) {
            if (positions.isEmpty() || text.isBlank()) return;
            TextPosition first = positions.get(0);
            TextPosition last = positions.get(positions.size() - 1);
            words.add(new Word(getCurrentPageNo(), first.getXDirAdj(), last.getXDirAdj() + last.getWidthDirAdj(),
                    first.getYDirAdj(), text));
            chars += text.strip().length();
        }
    }

    static FileReport pdf(byte[] bytes) throws IOException {
        List<FileFinding> findings = new ArrayList<>();
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            int pages = doc.getNumberOfPages();
            Collector text = new Collector();
            text.getText(doc);
            int words = (int) text.words.stream().flatMap(w -> java.util.Arrays.stream(w.text().split("\\s+"))).filter(s -> !s.isBlank()).count();

            boolean scanned = text.chars < MIN_CHARS_PER_PAGE * Math.max(1, pages);
            int images = 0;
            boolean unembedded = false;
            for (PDPage page : doc.getPages()) {
                PDResources res = page.getResources();
                if (res == null) continue;
                for (COSName name : res.getXObjectNames()) {
                    PDXObject x = res.getXObject(name);
                    if (x instanceof PDImageXObject) images++;
                }
                for (COSName name : res.getFontNames()) {
                    PDFont font = res.getFont(name);
                    if (font != null && !font.isEmbedded() && !font.isStandard14()) unembedded = true;
                }
            }

            if (scanned) {
                findings.add(critical("no-text", "No readable text in the file",
                        "This looks like a scan or a picture of a CV, so an ATS cannot read any of it. "
                                + "Save or export a text-based PDF from your editor or from Word instead."));
            } else {
                int split = linesWithTwoParts(text.words);
                if (split >= COLUMN_LINES) {
                    findings.add(warning("columns-or-tables", "The layout looks like columns or a table",
                            "Several lines have two separate blocks of text side by side. Some ATS read these in the "
                                    + "wrong order and mix them up. A single-column layout is the safest."));
                }
                if (images > 0 && text.chars < 400 * Math.max(1, pages)) {
                    findings.add(warning("graphics", "Much of the page is graphics",
                            "The file has pictures and very little text. An ATS only reads the text, so anything drawn "
                                    + "as a picture (a skills chart, for example) is invisible to it."));
                }
            }
            if (images > 0 && !scanned) {
                findings.add(note("images", "The file contains pictures",
                        "An ATS ignores pictures. Make sure no important detail (your name, contact details or skills) is only in an image."));
            }
            if (unembedded) {
                findings.add(note("fonts", "Some fonts are not embedded",
                        "Text in fonts that are not embedded can come out garbled when a system extracts it. Exporting to PDF again usually fixes this."));
            }
            return new FileReport(new FileMeta("pdf", pages, words), findings);
        }
    }

    private static final Pattern DATE_WORDS = Pattern.compile(
            "(?i)jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?|present|current|now|till|to|and");

    /** "Jan 2021 - Present" and "2018 – 2022" are dates, not a second column. */
    static boolean dateLike(String text) {
        String rest = DATE_WORDS.matcher(text).replaceAll("").replaceAll("[\\d\\p{Punct}\\s\\u2013\\u2014]", "");
        return rest.isEmpty();
    }

    /** How many lines have two substantial pieces of text separated by a wide gap (columns, table cells). */
    static int linesWithTwoParts(List<Word> words) {
        Map<String, List<Word>> lines = new HashMap<>();
        for (Word w : words) lines.computeIfAbsent(w.page() + ":" + Math.round(w.y() / 2f), k -> new ArrayList<>()).add(w);
        int count = 0;
        for (List<Word> line : lines.values()) {
            line.sort(Comparator.comparing(Word::x));
            List<StringBuilder> parts = new ArrayList<>();
            StringBuilder current = new StringBuilder();
            float previousEnd = Float.NaN;
            for (Word w : line) {
                if (!Float.isNaN(previousEnd) && w.x() - previousEnd > GUTTER) {
                    parts.add(current);
                    current = new StringBuilder();
                }
                if (current.length() > 0) current.append(' ');
                current.append(w.text().strip());
                previousEnd = w.end();
            }
            parts.add(current);
            long substantial = parts.stream().map(StringBuilder::toString)
                    .filter(t -> t.length() >= SUBSTANTIAL && !dateLike(t)).count();
            if (substantial >= 2) count++;
        }
        return count;
    }

    // --- DOCX -----------------------------------------------------------------------------------

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+");
    private static final Pattern PHONE = Pattern.compile("\\+?\\d[\\d\\s().-]{7,}\\d");
    private static final Pattern PAGES = Pattern.compile("<Pages>(\\d+)</Pages>");

    /** @param text the document's text, already extracted by DocxText */
    static FileReport docx(byte[] bytes, String text) throws IOException {
        Map<String, byte[]> parts = parts(bytes);
        int tables = 0;
        int textBoxes = 0;
        int images = 0;
        boolean columns = false;
        byte[] body = parts.get("word/document.xml");
        if (body != null) {
            try {
                XMLStreamReader r = reader(body);
                while (r.hasNext()) {
                    if (r.next() != XMLStreamConstants.START_ELEMENT) continue;
                    switch (r.getLocalName()) {
                        case "tbl" -> tables++;
                        case "txbxContent" -> textBoxes++;
                        case "pic" -> images++;
                        case "cols" -> {
                            for (int i = 0; i < r.getAttributeCount(); i++) {
                                if ("num".equals(r.getAttributeLocalName(i)) && parseInt(r.getAttributeValue(i)) > 1) columns = true;
                            }
                        }
                        default -> { }
                    }
                }
            } catch (XMLStreamException e) {
                // A document we cannot walk is reported by the text extraction; here we just have fewer findings.
            }
        }

        boolean contactInHeader = false;
        for (Map.Entry<String, byte[]> part : parts.entrySet()) {
            String name = part.getKey();
            if (!(name.startsWith("word/header") || name.startsWith("word/footer"))) continue;
            String t = plainText(part.getValue());
            if (EMAIL.matcher(t).find() || PHONE.matcher(t).find()) contactInHeader = true;
        }

        Integer pages = null;
        byte[] app = parts.get("docProps/app.xml");
        if (app != null) {
            Matcher m = PAGES.matcher(new String(app, StandardCharsets.UTF_8));
            if (m.find()) pages = parseInt(m.group(1));
        }

        List<FileFinding> findings = new ArrayList<>();
        if (tables > 0) {
            findings.add(warning("tables", "The document uses tables",
                    "Many CVs use a table for layout. Some ATS read table cells in the wrong order or skip them. Plain paragraphs are safest."));
        }
        if (textBoxes > 0) {
            findings.add(warning("text-boxes", "Some text is in text boxes",
                    "Many ATS cannot read text boxes at all, so that text can go missing. Move it into the main body of the document."));
        }
        if (columns) {
            findings.add(warning("columns", "The document uses more than one column",
                    "Some ATS read the columns in the wrong order. A single-column layout is the safest."));
        }
        if (contactInHeader) {
            findings.add(warning("header-footer-contact", "Contact details are in the header or footer",
                    "Many ATS skip headers and footers, so your email or phone may not be found. Put them in the main body."));
        }
        if (images > 0) {
            findings.add(note("images", "The document contains pictures",
                    "An ATS ignores pictures. Make sure no important detail is only in an image."));
        }
        int words = text == null || text.isBlank() ? 0 : text.trim().split("\\s+").length;
        return new FileReport(new FileMeta("docx", pages, words), findings);
    }

    private static int parseInt(String s) {
        try {
            return Integer.parseInt(s.trim());
        } catch (RuntimeException e) {
            return 0;
        }
    }

    private static XMLStreamReader reader(byte[] xml) throws XMLStreamException {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        // The file is untrusted: no DTDs and no external entities.
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        return factory.createXMLStreamReader(new ByteArrayInputStream(xml), StandardCharsets.UTF_8.name());
    }

    private static String plainText(byte[] xml) {
        StringBuilder out = new StringBuilder();
        try {
            XMLStreamReader r = reader(xml);
            boolean inText = false;
            while (r.hasNext()) {
                int e = r.next();
                if (e == XMLStreamConstants.START_ELEMENT && "t".equals(r.getLocalName())) inText = true;
                else if (e == XMLStreamConstants.END_ELEMENT && "t".equals(r.getLocalName())) {
                    inText = false;
                    out.append(' ');
                } else if (e == XMLStreamConstants.CHARACTERS && inText) out.append(r.getText());
            }
        } catch (XMLStreamException ignored) {
            // unreadable part: treated as having no text
        }
        return out.toString();
    }

    /** The parts of the zip we look at, each read with a size cap so a small file cannot expand without limit. */
    private static Map<String, byte[]> parts(byte[] docx) throws IOException {
        Map<String, byte[]> out = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(docx))) {
            ZipEntry entry;
            for (int seen = 0; (entry = zip.getNextEntry()) != null && seen < MAX_ENTRIES; seen++) {
                String name = entry.getName();
                boolean wanted = name.equals("word/document.xml") || name.equals("docProps/app.xml")
                        || (name.startsWith("word/header") && name.endsWith(".xml"))
                        || (name.startsWith("word/footer") && name.endsWith(".xml"));
                if (wanted) out.put(name, readCapped(zip));
            }
        }
        return out;
    }

    private static byte[] readCapped(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            if (out.size() > MAX_PART_BYTES) throw new IOException("part too large");
        }
        return out.toByteArray();
    }
}
