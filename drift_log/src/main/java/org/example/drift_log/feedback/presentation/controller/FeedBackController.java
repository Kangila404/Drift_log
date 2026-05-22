package org.example.drift_log.feedback.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.feedback.application.FeedBackService;
import org.example.drift_log.feedback.presentation.dto.req.EndingFeedBackRequest;
import org.example.drift_log.feedback.presentation.dto.res.EndingFeedBackResponse;
import org.example.drift_log.user.domain.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "피드백 관련 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/feedback")
public class FeedBackController {

    private final FeedBackService feedBackService;

    @PostMapping("/ending")
    public ResponseEntity<EndingFeedBackResponse> writeFeedback(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody EndingFeedBackRequest request
    ){
        EndingFeedBackResponse response = feedBackService.writeFeedback(userId, request);

        return ResponseEntity.ok(response);
    }

}
