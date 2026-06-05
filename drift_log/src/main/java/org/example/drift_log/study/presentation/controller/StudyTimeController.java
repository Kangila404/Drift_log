package org.example.drift_log.study.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.study.application.StudyTimeService;
import org.example.drift_log.study.presentation.dto.req.StudyTimeRequest;
import org.example.drift_log.study.presentation.dto.res.StudySummaryResponse;
import org.example.drift_log.study.presentation.dto.res.StudyTimeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "공부 시간 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study")
public class StudyTimeController {

    private final StudyTimeService studyTimeService;

    @PostMapping
    public ResponseEntity<StudyTimeResponse> save(
        @Valid @RequestBody StudyTimeRequest request,
        @AuthenticationPrincipal String userId
        ){
        StudyTimeResponse response = studyTimeService.save(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/summary")
    public ResponseEntity<StudySummaryResponse> getSummary(
        @AuthenticationPrincipal String userId
    ){
        StudySummaryResponse response = studyTimeService.getSummary(userId);
        return ResponseEntity.ok(response);
    }




}
