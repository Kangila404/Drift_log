package org.example.drift_log.weather.application;

import org.example.drift_log.weather.presentation.dto.res.TodayWeatherResponse;

public interface WeatherThemeService {
    TodayWeatherResponse getTodayWeather();
}
