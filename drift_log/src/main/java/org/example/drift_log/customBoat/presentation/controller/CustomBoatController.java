package org.example.drift_log.customBoat.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customBoat.application.CustomBoatService;
import org.example.drift_log.customBoat.presentation.dto.req.UpdateBoatRequest;
import org.example.drift_log.customBoat.presentation.dto.res.CustomBoatResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "커스텀 보트 색 조회/수정 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/custom-boat")
public class CustomBoatController {

    private final CustomBoatService customBoatService;

    @GetMapping
    public ResponseEntity<CustomBoatResponse> getMyBoat(
        @AuthenticationPrincipal String userId
    ){
        CustomBoatResponse response = customBoatService.getMyBoat(userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping
    public ResponseEntity<Void> updateBoat(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody UpdateBoatRequest request
    ){
        customBoatService.updateBoat(userId, request);
        return ResponseEntity.ok().build();
    }
}