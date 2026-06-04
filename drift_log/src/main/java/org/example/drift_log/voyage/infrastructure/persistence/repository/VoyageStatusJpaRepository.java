package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VoyageStatusJpaRepository extends JpaRepository<VoyageStatus,Long> {

    Optional<VoyageStatus> findByUserId(Long userId);

    @Query(value = "SELECT COUNT(*) FROM voyage_status WHERE is_family_reunited = 1", nativeQuery = true)
    Long countClearUser();

}
