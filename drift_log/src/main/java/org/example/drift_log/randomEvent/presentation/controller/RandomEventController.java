package org.example.drift_log.randomEvent.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.randomEvent.application.RandomEventService;
import org.example.drift_log.randomEvent.presentation.dto.res.RandomEventResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "랜덤 이벤트 api")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/events")
public class RandomEventController {

    private final RandomEventService randomEventService;

    @GetMapping("/random")
    public ResponseEntity<RandomEventResponse> getRandomEvent(
        @AuthenticationPrincipal String userId
    ) {
        return ResponseEntity.ok(randomEventService.getRandomEvent());
    }

}
