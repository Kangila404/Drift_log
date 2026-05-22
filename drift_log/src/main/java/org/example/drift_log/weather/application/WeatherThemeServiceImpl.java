package org.example.drift_log.weather.application;

import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.presentation.dto.res.TodayWeatherResponse;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherThemeServiceImpl implements WeatherThemeService{

    private final WeatherThemeRepository weatherThemeRepository;

    @Override
    public TodayWeatherResponse getTodayWeather() {
        WeatherTheme weatherTheme= weatherThemeRepository.findByDate(LocalDate.now(ZoneId.of("Asia/Seoul")))
            .orElseThrow(() -> new WeatherException(WeatherErrorCode.TODAY_WEATHER_THEME_NOT_FOUND));
        return TodayWeatherResponse.from(weatherTheme);
    }
}
