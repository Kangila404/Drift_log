package org.example.drift_log.trace.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscoveredTraceJpaRepository extends JpaRepository<DiscoveredTrace,Long> {

    Optional<DiscoveredTrace> findByUserIdAndTraceId(Long userId, Long traceId);
}