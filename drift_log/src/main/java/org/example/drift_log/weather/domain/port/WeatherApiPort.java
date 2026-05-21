package org.example.drift_log.weather.domain.port;

import org.example.drift_log.weather.presentation.dto.res.WeatherRawData;

public interface WeatherApiPort {
    WeatherRawData fetchTodayWeather();
}
