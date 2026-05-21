package org.example.drift_log.trace.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class DiscoveredTraceRepositoryImpl implements DiscoveredTraceRepository {

    private final DiscoveredTraceJpaRepository discoveredTraceJpaRepository;


    @Override
    public Optional<DiscoveredTrace> findByUserIdAndTraceId(Long userId, Long traceId) {
        return discoveredTraceJpaRepository.findByUserIdAndTraceId(userId, traceId);
    }

    @Override
    public List<DiscoveredTrace> findAllByUserId(Long userId) {
        return discoveredTraceJpaRepository.findAllByUserId(userId);
    }

    @Override
    public void save(DiscoveredTrace discoveredTrace) {
        discoveredTraceJpaRepository.save(discoveredTrace);
    }
}
