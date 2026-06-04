package org.example.drift_log.weather.domain.repository;

import java.util.Optional;
import org.example.drift_log.weather.domain.model.Weather;

public interface WeatherRepository {
    Optional<Weather> findById(Long id);


}
