package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.List;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoyageLogJpaRepository extends JpaRepository<VoyageLog,Long> {
    List<VoyageLog> findAllByUserId(Long userId);
}
