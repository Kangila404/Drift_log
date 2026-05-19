package org.example.drift_log.trace.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TraceRepositoryImpl implements TraceRepository {

    private final TraceJpaRepository traceJpaRepository;

    @Override
    public Optional<Trace> findByCityId(Long cityId) {
        return traceJpaRepository.findByCityId(cityId);
    }
}
