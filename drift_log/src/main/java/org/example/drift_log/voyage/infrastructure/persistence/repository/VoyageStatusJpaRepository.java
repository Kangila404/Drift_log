package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoyageStatusJpaRepository extends JpaRepository<VoyageStatus,Long> {

    Optional<VoyageStatus> findByUserId(Long userId);

}
