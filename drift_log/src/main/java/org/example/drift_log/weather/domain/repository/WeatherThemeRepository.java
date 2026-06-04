package org.example.drift_log.weather.domain.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.example.drift_log.weather.domain.model.WeatherTheme;

public interface WeatherThemeRepository {
    void save(WeatherTheme weatherTheme);

    boolean existsByDate(LocalDate date);

    Optional<WeatherTheme> findByDate(LocalDate date);
}
