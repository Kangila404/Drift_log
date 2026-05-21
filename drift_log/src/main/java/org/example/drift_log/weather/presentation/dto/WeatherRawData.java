package org.example.drift_log.weather.presentation.dto;

public record WeatherRawData(
    String skyText,
    String sky,
    String pty,
    String wsd
) {

}
