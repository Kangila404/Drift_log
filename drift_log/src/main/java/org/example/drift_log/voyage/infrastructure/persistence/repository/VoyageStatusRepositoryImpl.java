package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class VoyageStatusRepositoryImpl implements VoyageStatusRepository {

    private final VoyageStatusJpaRepository voyageStatusJpaRepository;

    @Override
    public Optional<VoyageStatus> findByUserId(Long userId) {

        return voyageStatusJpaRepository.findByUserId(userId);
    }

    @Override
    public void save(VoyageStatus voyageStatus) {
        voyageStatusJpaRepository.save(voyageStatus);
    }

    @Override
    public Long countClearUser() {
        return voyageStatusJpaRepository.countClearUser();
    }
}
