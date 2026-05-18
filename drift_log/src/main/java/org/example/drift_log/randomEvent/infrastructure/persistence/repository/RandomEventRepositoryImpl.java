package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.randomEvent.domain.repository.RandomEventRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RandomEventRepositoryImpl implements RandomEventRepository {

    private final RandomEventJpaRepository randomEventJpaRepository;
}
