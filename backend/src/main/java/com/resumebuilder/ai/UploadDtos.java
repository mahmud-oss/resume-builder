package com.resumebuilder.ai;

import java.util.List;

/** What the CV upload returns: the CV's content in the shape of the editor's fields, never any layout. */
public final class UploadDtos {

    private UploadDtos() {
    }

    public record Basics(String fullName, String headline, String email, String phone, String location,
                         String website, String linkedin) {
    }

    public record FieldValue(String field, String value) {
    }

    public record Entry(List<FieldValue> fields) {
    }

    public record ExtractedSection(String type, String title, List<Entry> entries) {
    }

    /**
     * @param other text from the file that fits no field (kept, never dropped)
     * @param reviewNotes short things the user should check, for example "graduation year was unclear"
     */
    public record Extraction(Basics basics, List<ExtractedSection> sections, String other, List<String> reviewNotes) {
    }

    public record UploadResponse(Extraction cv, boolean demo) {
    }
}
