package com.resumebuilder.ai;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

/**
 * Reads the text of a .docx (a zip file holding word/document.xml). Paragraphs become lines, list items
 * start with "- ", table cells are separated by a tab. Layout, images and styling are ignored.
 * Written against a size cap on what is unzipped, so a small file cannot expand into a huge one.
 */
final class DocxText {

    /** Most we will unzip from word/document.xml, in bytes. */
    private static final int MAX_XML_BYTES = 20 * 1024 * 1024;
    private static final int MAX_ENTRIES = 500;

    private DocxText() {
    }

    /** Thrown when the file is not a readable Word document. */
    static final class NotDocxException extends Exception {
        NotDocxException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    static String extract(byte[] docx) throws NotDocxException {
        byte[] xml = documentXml(docx);
        try {
            return text(xml);
        } catch (XMLStreamException e) {
            throw new NotDocxException("The document's text could not be read.", e);
        }
    }

    private static byte[] documentXml(byte[] docx) throws NotDocxException {
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(docx))) {
            ZipEntry entry;
            for (int seen = 0; (entry = zip.getNextEntry()) != null; seen++) {
                if (seen > MAX_ENTRIES) break;
                if ("word/document.xml".equals(entry.getName())) return readCapped(zip);
            }
        } catch (IOException e) {
            throw new NotDocxException("The file is not a valid Word document.", e);
        }
        throw new NotDocxException("The file is not a Word (.docx) document.", null);
    }

    private static byte[] readCapped(InputStream in) throws IOException, NotDocxException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
            if (out.size() > MAX_XML_BYTES) throw new NotDocxException("The document is too large to read.", null);
        }
        return out.toByteArray();
    }

    private static String text(byte[] xml) throws XMLStreamException {
        XMLInputFactory factory = XMLInputFactory.newFactory();
        // The file is untrusted: no DTDs and no external entities.
        factory.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        factory.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        XMLStreamReader r = factory.createXMLStreamReader(new ByteArrayInputStream(xml), StandardCharsets.UTF_8.name());

        StringBuilder out = new StringBuilder();
        StringBuilder paragraph = new StringBuilder();
        StringBuilder row = new StringBuilder();
        StringBuilder cell = new StringBuilder();
        int tableDepth = 0;
        boolean listItem = false;
        boolean inText = false;
        while (r.hasNext()) {
            int event = r.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                switch (r.getLocalName()) {
                    case "tbl" -> tableDepth++;
                    case "p" -> {
                        paragraph.setLength(0);
                        listItem = false;
                    }
                    case "numPr" -> listItem = true;
                    case "t" -> inText = true;
                    case "tab" -> paragraph.append('\t');
                    case "br", "cr" -> paragraph.append('\n');
                    default -> { }
                }
            } else if (event == XMLStreamConstants.CHARACTERS && inText) {
                paragraph.append(r.getText());
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                switch (r.getLocalName()) {
                    case "t" -> inText = false;
                    case "tbl" -> tableDepth = Math.max(0, tableDepth - 1);
                    // A table row stays on one line, its cells separated by a tab.
                    case "tc" -> {
                        row.append(cell.toString().strip()).append('\t');
                        cell.setLength(0);
                    }
                    case "tr" -> {
                        String line = row.toString().strip();
                        if (!line.isEmpty()) out.append(line).append('\n');
                        row.setLength(0);
                    }
                    case "p" -> {
                        String line = paragraph.toString().strip();
                        if (!line.isEmpty()) {
                            if (tableDepth > 0) cell.append(line).append(' ');
                            else out.append(listItem ? "- " : "").append(line).append('\n');
                        }
                        paragraph.setLength(0);
                    }
                    default -> { }
                }
            }
        }
        return out.toString().strip();
    }
}
