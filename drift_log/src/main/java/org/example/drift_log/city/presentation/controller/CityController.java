package org.example.drift_log.city.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.application.MapService;
import org.example.drift_log.city.presentation.dto.res.MapResponse;
import org.example.drift_log.city.presentation.dto.res.DurationTimeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "지도 관련 Controller")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/map")
public class CityController {

    private final MapService mapService;

    @GetMapping
    public ResponseEntity<MapResponse> getMap(
        @AuthenticationPrincipal String userId
    ){
        MapResponse response = mapService.getMap(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/routes/{toCityId}")
    public ResponseEntity<DurationTimeResponse> getRoutes(
        @AuthenticationPrincipal String userId,
        @PathVariable Long toCityId
    ){
        DurationTimeResponse response = mapService.getRoutes(userId, toCityId);
        return ResponseEntity.ok(response);
    }


}
