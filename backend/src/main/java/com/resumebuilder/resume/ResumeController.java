package com.resumebuilder.resume;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.resumebuilder.resume.ResumeDtos.CreateResumeRequest;
import com.resumebuilder.resume.ResumeDtos.ResumeResponse;
import com.resumebuilder.resume.ResumeDtos.ResumeSummary;
import com.resumebuilder.resume.ResumeDtos.UpdateResumeRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumes;

    public ResumeController(ResumeService resumes) {
        this.resumes = resumes;
    }

    @GetMapping
    List<ResumeSummary> list(@AuthenticationPrincipal Jwt jwt) {
        return resumes.list(userId(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ResumeResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateResumeRequest request) {
        return resumes.create(userId(jwt), request);
    }

    @GetMapping("/{id}")
    ResumeResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return resumes.get(userId(jwt), id);
    }

    @PutMapping("/{id}")
    ResumeResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                          @Valid @RequestBody UpdateResumeRequest request) {
        return resumes.update(userId(jwt), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        resumes.delete(userId(jwt), id);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
