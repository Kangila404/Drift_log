package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import java.util.List;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RandomEventJpaRepository extends JpaRepository<RandomEvent, Long> {

    List<RandomEvent> findByTriggerWeatherIsNullOrTriggerWeather(String triggerWeather);
}
