package org.example.drift_log.weather.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.application.WeatherThemeService;
import org.example.drift_log.weather.presentation.dto.res.TodayWeatherResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "날씨 관련 api")
@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherThemeService weatherThemeService;

    @GetMapping("/today")
    public ResponseEntity<TodayWeatherResponse> getTodayWeather(){
        TodayWeatherResponse response = weatherThemeService.getTodayWeather();
        return ResponseEntity.ok(response);
    }

}
