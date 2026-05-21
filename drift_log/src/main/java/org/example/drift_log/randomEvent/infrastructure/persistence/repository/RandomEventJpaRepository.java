package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RandomEventJpaRepository extends JpaRepository<RandomEvent, Long> {

    List<RandomEvent> findByTriggerWeatherIsNullOrTriggerWeather(String triggerWeather);

    @Query("SELECT r FROM RandomEvent r ORDER BY RAND() LIMIT 1")
    Optional<RandomEvent> findRandom();
}
