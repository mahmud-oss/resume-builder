package com.resumebuilder.ai;

import java.util.List;

import com.resumebuilder.ai.ChatModelClient.Usage;
import com.resumebuilder.ai.UploadDtos.Basics;
import com.resumebuilder.ai.UploadDtos.Entry;
import com.resumebuilder.ai.UploadDtos.Extraction;
import com.resumebuilder.ai.UploadDtos.ExtractedSection;
import com.resumebuilder.ai.UploadDtos.FieldValue;

/**
 * Used when no API key is set: it ignores the file's content and returns a fixed sample CV, so the whole
 * upload flow can be tried without calling anything or spending anything.
 */
public class DemoCvExtractor implements CvExtractor {

    private static Entry entry(String... kv) {
        FieldValue[] fields = new FieldValue[kv.length / 2];
        for (int i = 0; i < fields.length; i++) fields[i] = new FieldValue(kv[2 * i], kv[2 * i + 1]);
        return new Entry(List.of(fields));
    }

    @Override
    public Result extract(Source source) {
        Extraction cv = new Extraction(
                new Basics("Demo Candidate", "Junior Accountant", "demo@example.com", "01700000000", "Dhaka, Bangladesh", "", ""),
                List.of(
                        new ExtractedSection("summary", "Summary", List.of(entry("text",
                                "This is a sample CV shown because the AI is in demo mode. Your own file was not read."))),
                        new ExtractedSection("experience", "Experience", List.of(entry(
                                "role", "Accounts Assistant", "company", "Sample Traders Ltd", "location", "Dhaka",
                                "startDate", "Jan 2022", "endDate", "Present",
                                "description", "Prepared daily cash reports\nHelped with month-end closing"))),
                        new ExtractedSection("education", "Education", List.of(entry(
                                "degree", "BBA in Accounting", "institution", "Sample University", "startDate", "2018",
                                "endDate", "2022"))),
                        new ExtractedSection("skills", "Skills", List.of(entry("category", "Software", "skills", "Excel, Tally")))),
                "",
                List.of("Demo mode: this is sample content, not read from your file."));
        return new Result(cv, Usage.NONE);
    }

    @Override
    public boolean demo() {
        return true;
    }

    @Override
    public String modelName() {
        return "demo";
    }
}
