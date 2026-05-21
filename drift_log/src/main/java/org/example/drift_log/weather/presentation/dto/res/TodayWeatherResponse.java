package org.example.drift_log.weather.presentation.dto.res;

import org.example.drift_log.weather.domain.model.WeatherTheme;

public record TodayWeatherResponse(
    Long todayWeatherId
) {
    public static TodayWeatherResponse from(WeatherTheme weatherTheme){
        return new TodayWeatherResponse(weatherTheme.getId());
    }
}
