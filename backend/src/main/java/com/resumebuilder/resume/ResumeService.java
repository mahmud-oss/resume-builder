package com.resumebuilder.resume;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import com.resumebuilder.common.ApiException;
import com.resumebuilder.resume.ResumeDtos.CreateResumeRequest;
import com.resumebuilder.resume.ResumeDtos.ResumeResponse;
import com.resumebuilder.resume.ResumeDtos.ResumeSummary;
import com.resumebuilder.resume.ResumeDtos.UpdateResumeRequest;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class ResumeService {

    private static final String DEFAULT_TITLE = "Untitled resume";

    private final ResumeRepository repository;
    private final JsonMapper json;
    private final int maxJsonLength;

    public ResumeService(ResumeRepository repository, JsonMapper json,
                         @Value("${app.resume.max-json-length:1000000}") int maxJsonLength) {
        this.repository = repository;
        this.json = json;
        this.maxJsonLength = maxJsonLength;
    }

    public List<ResumeSummary> list(UUID userId) {
        return repository.list(userId).stream()
                .map(r -> new ResumeSummary(r.id(), r.title(), r.templateId(), r.updatedAt()))
                .toList();
    }

    public ResumeResponse get(UUID userId, UUID id) {
        return repository.find(userId, id).map(this::toResponse).orElseThrow(ResumeService::notFound);
    }

    public ResumeResponse create(UUID userId, CreateResumeRequest request) {
        String title = request.title() == null || request.title().isBlank() ? DEFAULT_TITLE : request.title().trim();
        String data = serialise(request.data());
        String design = serialise(request.design());
        return toResponse(repository.insert(userId, title, request.templateId(), data, design));
    }

    public ResumeResponse update(UUID userId, UUID id, UpdateResumeRequest request) {
        String data = serialise(request.data());
        String design = serialise(request.design());
        return repository.update(userId, id, request.title().trim(), request.templateId(), data, design)
                .map(this::toResponse)
                .orElseThrow(ResumeService::notFound);
    }

    public void delete(UUID userId, UUID id) {
        if (!repository.delete(userId, id)) {
            throw notFound();
        }
    }

    /** Resume content and design must be JSON objects, and are capped in size. */
    private String serialise(JsonNode node) {
        if (node == null || node.isNull()) {
            return "{}";
        }
        if (!node.isObject()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Resume data and design must be JSON objects");
        }
        String text = node.toString();
        if (text.length() > maxJsonLength) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "Resume is too large");
        }
        return text;
    }

    private ResumeResponse toResponse(ResumeRepository.Row row) {
        return new ResumeResponse(row.id(), row.title(), row.templateId(),
                json.readTree(row.data()), json.readTree(row.design()), row.createdAt(), row.updatedAt());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "Resume not found");
    }
}
