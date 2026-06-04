package org.example.drift_log.voyage.infrastructure.persistence.repository;

import java.util.List;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoyageLogJpaRepository extends JpaRepository<VoyageLog,Long> {
    List<VoyageLog> findAllByUserId(Long userId);

    Long countDistinctToCityByUserId(Long userId);

    Long countByUserId(Long userId);

    @Query("SELECT DISTINCT v.toCity.id FROM VoyageLog v WHERE v.userId = :userId")
    List<Long> findDistinctToCityIdsByUserId(@Param("userId") Long userId);

    Long countByUserIdAndToCityId(Long userId, Long toCityId);
}
