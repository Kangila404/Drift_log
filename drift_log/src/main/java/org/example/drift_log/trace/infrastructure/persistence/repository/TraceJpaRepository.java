package org.example.drift_log.trace.infrastructure.persistence.repository;

import org.example.drift_log.trace.domain.model.Trace;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TraceJpaRepository extends JpaRepository<Trace,Long> {

}
