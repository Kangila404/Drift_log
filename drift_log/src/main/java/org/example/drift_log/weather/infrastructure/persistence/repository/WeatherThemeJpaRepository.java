package org.example.drift_log.weather.infrastructure.persistence.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeatherThemeJpaRepository extends JpaRepository<WeatherTheme,Long> {
    boolean existsByDate(LocalDate date);

    Optional<WeatherTheme> findByDate(LocalDate date);
}
