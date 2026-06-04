package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
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

    @Override
    public Optional<VoyageLog> findById(Long logId) {
        return voyageLogJpaRepository.findById(logId);
    }

    @Override
    public List<VoyageLog> findAllByUserId(Long userId) {
        return voyageLogJpaRepository.findAllByUserId(userId);
    }

    @Override
    public Long countDistinctToCityByUserId(Long userId) {
        return voyageLogJpaRepository.countDistinctToCityByUserId(userId);
    }

    @Override
    public long countByUserId(Long userId) {
        return voyageLogJpaRepository.countByUserId(userId);
    }

    @Override
    public List<Long> findDistinctToCityIdsByUserId(Long userId) {
        return voyageLogJpaRepository.findDistinctToCityIdsByUserId(userId);
    }

    @Override
    public Long countByUserIdAndToCityId(Long userId, Long cityId) {
        return voyageLogJpaRepository.countByUserIdAndToCityId(userId, cityId);
    }


}
