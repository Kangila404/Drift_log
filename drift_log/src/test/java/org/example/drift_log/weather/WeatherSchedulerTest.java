package org.example.drift_log.weather;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.example.drift_log.weather.application.WeatherService;
import org.example.drift_log.weather.infrastructure.scheduler.WeatherScheduler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class WeatherSchedulerTest {

    @Test
    @DisplayName("스케줄러는 날씨 업데이트 서비스를 호출한다")
    void schedulerCallsWeatherUpdateService() {
        WeatherService weatherService = mock(WeatherService.class);
        WeatherScheduler scheduler = new WeatherScheduler(weatherService);

        scheduler.updateTodayWeather();

        verify(weatherService).updateTodayWeather();
    }
}
