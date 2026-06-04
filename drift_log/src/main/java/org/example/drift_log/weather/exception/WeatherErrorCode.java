package org.example.drift_log.weather.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WeatherErrorCode {
    WEATHER_NOT_FOUND(HttpStatus.NOT_FOUND,                  "날씨를 찾을 수 없습니다."),
    TODAY_WEATHER_ALREADY_EXISTS(HttpStatus.CONFLICT,        "이미 오늘의 날씨가 존재합니다."),
    TODAY_WEATHER_THEME_NOT_FOUND(HttpStatus.NOT_FOUND,      "오늘의 날씨가 없습니다.");

    private final HttpStatus status;
    private final String message;
}
