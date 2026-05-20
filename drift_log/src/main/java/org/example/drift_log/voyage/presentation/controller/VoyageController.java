package org.example.drift_log.voyage.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.application.VoyageService;
import org.example.drift_log.voyage.presentation.dto.res.VoyageResumeResponse;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageCompleteResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStopResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "항해 관련 api")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/voyages")
public class VoyageController {

    private final VoyageService voyageService;

    // 1. 현재 배 위치 불러 오기
    @GetMapping("/status")
    public ResponseEntity<VoyageStatusResponse> getStatus(
        @AuthenticationPrincipal String userId
    ){
        VoyageStatusResponse response = voyageService.getVoyageStatus(userId);
        return ResponseEntity.ok(response);
    }


    // 2. 목적지 선택 후, 항해 시작
    @PostMapping("/start")
    public ResponseEntity<VoyageStartResponse> start(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody VoyageStartRequest request
    ){
        VoyageStartResponse response = voyageService.voyageStart(userId, request);
        return ResponseEntity.ok(response);
    }

    // 3. 항해 중, 일시 정지
    @PostMapping("/stop")
    public ResponseEntity<VoyageStopResponse> stop(
        @AuthenticationPrincipal String userId
    ){
        VoyageStopResponse response = voyageService.voyageStop(userId);
        return ResponseEntity.ok(response);
    }

    // 4. 일지 정지 -> 항해 개시
    @PostMapping("/resume")
    public ResponseEntity<VoyageResumeResponse> resume(
        @AuthenticationPrincipal String userId
        ){
        VoyageResumeResponse response = voyageService.voyageResume(userId);
        return ResponseEntity.ok(response);
    }

    // 5. 항해 도착
    @PostMapping("/complete")
    public ResponseEntity<VoyageCompleteResponse> complete(
        @AuthenticationPrincipal String userId
    ){
        VoyageCompleteResponse response = voyageService.voyageComplete(userId);
        return ResponseEntity.ok(response);
    }
}

