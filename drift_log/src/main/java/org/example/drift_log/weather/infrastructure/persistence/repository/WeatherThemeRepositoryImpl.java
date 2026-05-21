package org.example.drift_log.weather.infrastructure.persistence.repository;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WeatherThemeRepositoryImpl implements WeatherThemeRepository {

    private final WeatherThemeJpaRepository weatherThemeJpaRepository;

    @Override
    public void save(WeatherTheme weatherTheme) {
        weatherThemeJpaRepository.save(weatherTheme);
    }

    @Override
    public boolean existsByDate(LocalDate date) {
        return weatherThemeJpaRepository.existsByDate(date);
    }
}
