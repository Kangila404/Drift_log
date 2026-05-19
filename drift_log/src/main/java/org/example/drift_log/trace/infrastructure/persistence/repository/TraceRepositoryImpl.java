package org.example.drift_log.trace.infrastructure.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TraceRepositoryImpl implements TraceRepository {

    private final TraceJpaRepository traceJpaRepository;

}
