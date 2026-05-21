package org.example.drift_log.trace.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;

public interface DiscoveredTraceRepository {
    Optional<DiscoveredTrace> findByUserIdAndTraceId(Long userId, Long traceId);

    List<DiscoveredTrace> findAllByUserId(Long userId);

    void save(DiscoveredTrace discoveredTrace);
}
