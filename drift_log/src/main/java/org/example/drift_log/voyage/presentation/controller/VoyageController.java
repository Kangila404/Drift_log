package org.example.drift_log.voyage.presentation.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.application.VoyageService;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStatusRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/voyages")
public class VoyageController {

    private final VoyageService voyageService;

    // 1. 현재 배 위치 불러 오기
    @GetMapping("/status")
    public ResponseEntity<VoyageStatusResponse> getStatus(@RequestParam String userId){
        VoyageStatusResponse response = voyageService.getVoyageStatus(userId);
        return ResponseEntity.ok(response);
    }


    // 2. 목적지 선택 후, 항해 시작
    @PostMapping("/start")
    public ResponseEntity<VoyageStartResponse> start(@Valid @RequestBody VoyageStartRequest request){
        VoyageStartResponse response = voyageService.voyageStart(request);
        return ResponseEntity.ok(response);
    }

}

