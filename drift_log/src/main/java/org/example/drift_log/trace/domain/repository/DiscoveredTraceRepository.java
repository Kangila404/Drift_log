package org.example.drift_log.trace.domain.repository;

import java.util.Optional;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;

public interface DiscoveredTraceRepository {
    Optional<DiscoveredTrace> findByUserIdAndTraceId(Long userId, Long traceId);

    void save(DiscoveredTrace discoveredTrace);
}
