package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;
import org.example.drift_log.randomEvent.domain.repository.RandomEventRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RandomEventRepositoryImpl implements RandomEventRepository {

    private final RandomEventJpaRepository randomEventJpaRepository;

    @Override
    public Optional<RandomEvent> findById(Long id) {
        return randomEventJpaRepository.findById(id);
    }

    @Override
    public Optional<RandomEvent> findRandom() {
        return randomEventJpaRepository.findRandom();
    }
}
