package com.resumebuilder.ai;

import java.util.List;

import com.resumebuilder.ai.UploadDtos.Extraction;

/** Shapes for the ATS checker's file-level checks. */
public final class AtsDtos {

    private AtsDtos() {
    }

    /**
     * One thing found about the file itself (not its words).
     * @param severity "critical", "warning" or "note"
     */
    public record FileFinding(String id, String severity, String title, String detail) {
    }

    /** @param kind "pdf" or "docx"; @param pages the real page count when the file says it, otherwise null */
    public record FileMeta(String kind, Integer pages, int words) {
    }

    public record FileReport(FileMeta meta, List<FileFinding> findings) {
    }

    /** What the checker gets back for an uploaded file: the CV read from it, and what is wrong with the file. */
    public record AtsFileResponse(Extraction cv, FileMeta meta, List<FileFinding> findings, boolean demo) {
    }
}
