package org.example.drift_log.voyage.infrastructure.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class VoyageLogRepositoryImpl implements VoyageLogRepository {

    private final VoyageLogJpaRepository voyageLogJpaRepository;

    @Override
    public void save(VoyageLog voyageLog) {
        voyageLogJpaRepository.save(voyageLog);
    }
}
