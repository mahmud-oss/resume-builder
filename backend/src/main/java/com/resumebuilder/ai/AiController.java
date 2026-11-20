package com.resumebuilder.ai;

import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.resumebuilder.ai.ChatDtos.ChatRequest;
import com.resumebuilder.ai.ChatDtos.ChatResponse;
import com.resumebuilder.ai.ChatDtos.Status;
import com.resumebuilder.ai.AtsDtos.AtsFileResponse;
import com.resumebuilder.ai.MatchDtos.MatchRequest;
import com.resumebuilder.ai.MatchDtos.MatchResponse;
import com.resumebuilder.ai.ReviewDtos.ReviewRequest;
import com.resumebuilder.ai.TailorDtos.RegenerateRequest;
import com.resumebuilder.ai.TailorDtos.RegenerateResponse;
import com.resumebuilder.ai.TailorDtos.TailorRequest;
import com.resumebuilder.ai.TailorDtos.TailorResponse;
import com.resumebuilder.ai.ReviewDtos.ReviewResponse;
import com.resumebuilder.ai.UploadDtos.UploadResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final ChatService chat;
    private final UploadService uploads;
    private final AtsService ats;
    private final ReviewService reviews;
    private final MatchService matches;
    private final TailorService tailors;

    public AiController(ChatService chat, UploadService uploads, AtsService ats, ReviewService reviews,
                        MatchService matches, TailorService tailors) {
        this.chat = chat;
        this.uploads = uploads;
        this.ats = ats;
        this.reviews = reviews;
        this.matches = matches;
        this.tailors = tailors;
    }

    /** Whether the assistant is available, and whether it is the built-in demo. */
    @GetMapping("/status")
    Status status() {
        return chat.status();
    }

    @PostMapping("/chat")
    ChatResponse chat(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChatRequest request) {
        return chat.chat(UUID.fromString(jwt.getSubject()), request);
    }

    /** Turns an uploaded CV (PDF or DOCX) into the fields of a resume. The file is read in memory and never stored. */
    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    UploadResponse upload(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) throws java.io.IOException {
        return uploads.convert(UUID.fromString(jwt.getSubject()), file.getOriginalFilename(), file.getBytes());
    }

    /** The ATS checker for an uploaded file: findings about the file itself, plus the CV read from it. */
    @PostMapping(value = "/ats-file", consumes = "multipart/form-data")
    AtsFileResponse atsFile(@AuthenticationPrincipal Jwt jwt, @RequestParam("file") MultipartFile file) throws java.io.IOException {
        return ats.checkFile(UUID.fromString(jwt.getSubject()), file.getOriginalFilename(), file.getBytes());
    }

    /** Feedback on the wording of a CV's summary and bullets, with suggested rewrites. */
    @PostMapping("/writing-review")
    ReviewResponse writingReview(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ReviewRequest request) {
        return reviews.review(UUID.fromString(jwt.getSubject()), request.cv());
    }

    /** Compares a CV with a pasted job description (Job Match). Also used by the ATS keyword check and Tailor. */
    @PostMapping("/job-match")
    MatchResponse jobMatch(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody MatchRequest request) {
        return matches.match(UUID.fromString(jwt.getSubject()), request);
    }

    /** Proposes wording changes that fit a resume to a job; the user accepts or rejects each one. */
    @PostMapping("/tailor")
    TailorResponse tailor(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody TailorRequest request) {
        return tailors.tailor(UUID.fromString(jwt.getSubject()), request);
    }

    /** New wording for one proposed change. */
    @PostMapping("/tailor/regenerate")
    RegenerateResponse tailorRegenerate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RegenerateRequest request) {
        return tailors.regenerate(UUID.fromString(jwt.getSubject()), request);
    }
}
