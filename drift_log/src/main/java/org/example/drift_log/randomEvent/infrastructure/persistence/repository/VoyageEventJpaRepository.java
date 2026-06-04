package org.example.drift_log.randomEvent.infrastructure.persistence.repository;

import org.example.drift_log.randomEvent.domain.model.VoyageEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoyageEventJpaRepository extends JpaRepository<VoyageEvent,Long> {

}
