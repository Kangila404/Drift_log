package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.randomEvent.domain.model.VoyageEvent;
import org.example.drift_log.randomEvent.domain.repository.VoyageEventRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class VoyageEventRepositoryImpl implements VoyageEventRepository {

    private final VoyageEventJpaRepository voyageEventJpaRepository;

    @Override
    public void save(VoyageEvent voyageEvent) {
        voyageEventJpaRepository.save(voyageEvent);
    }
}
