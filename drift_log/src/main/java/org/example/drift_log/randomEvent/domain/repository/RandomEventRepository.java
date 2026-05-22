package org.example.drift_log.randomEvent.domain.repository;

import java.util.Optional;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;

public interface RandomEventRepository {
    Optional<RandomEvent> findById(Long id);

    Optional<RandomEvent> findRandom();
}
