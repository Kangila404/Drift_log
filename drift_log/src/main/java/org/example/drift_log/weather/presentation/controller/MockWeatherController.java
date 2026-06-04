package org.example.drift_log.weather.presentation.controller;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.application.WeatherService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class MockWeatherController {

    private final WeatherService weatherService;


    @PostMapping("/updateWeather")
    public ResponseEntity<String> updateWeather(){
        weatherService.updateTodayWeather();
        return ResponseEntity.ok("날씨 업데이트 완료");
    }

}
