package com.resumebuilder.ai;

import com.resumebuilder.ai.ChatModelClient.ModelException;
import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.UploadDtos.Extraction;

/** Turns an uploaded CV into resume fields: the real model, or the built-in demo. */
public interface CvExtractor {

    /** What was uploaded: a PDF (sent to the model as a document) or text taken from a DOCX. Exactly one is set. */
    record Source(byte[] pdf, String text, String fileName) {
        static Source ofPdf(byte[] pdf, String fileName) {
            return new Source(pdf, null, fileName);
        }

        static Source ofText(String text, String fileName) {
            return new Source(null, text, fileName);
        }
    }

    record Result(Extraction cv, Usage usage) {
    }

    /** @throws ModelException when the model cannot produce a usable result */
    Result extract(Source source);

    boolean demo();

    String modelName();
}
