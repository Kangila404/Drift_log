package org.example.drift_log.weather.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum WeatherErrorCode {
    WEATHER_NOT_FOUND(HttpStatus.NOT_FOUND, "Weather not found."),
    TODAY_WEATHER_ALREADY_EXISTS(HttpStatus.CONFLICT, "Today weather already exists."),
    TODAY_WEATHER_THEME_NOT_FOUND(HttpStatus.NOT_FOUND, "Today weather theme not found."),
    WEATHER_API_RESPONSE_INVALID(HttpStatus.BAD_GATEWAY, "Invalid KMA weather API response.");

    private final HttpStatus status;
    private final String message;
}
