package org.example.drift_log.weather.infrastructure.persistence.repository;

import org.example.drift_log.weather.domain.model.Weather;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeatherJpaRepository extends JpaRepository<Weather,Long> {

}
