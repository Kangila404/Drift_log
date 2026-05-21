package org.example.drift_log.trace.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.trace.domain.model.Trace;

public interface TraceRepository {
    Optional<Trace> findByCityId(Long cityId);
    Long count();
}
