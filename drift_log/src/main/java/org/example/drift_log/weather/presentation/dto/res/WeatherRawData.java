package org.example.drift_log.weather.presentation.dto.res;

public record WeatherRawData(
    String skyText,
    String sky,
    String pty,
    String wsd
) {

}
