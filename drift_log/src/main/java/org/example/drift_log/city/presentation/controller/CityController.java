package org.example.drift_log.city.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.application.MapService;
import org.example.drift_log.city.presentation.dto.res.MapResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "지도 관련 Controller")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/map")
public class CityController {

    private final MapService mapService;

    @GetMapping
    public ResponseEntity<MapResponse> getMap(@RequestParam String userId){
        MapResponse response = mapService.getMap(userId);
        return ResponseEntity.ok(response);
    }

}
