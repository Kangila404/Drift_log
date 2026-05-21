package org.example.drift_log.voyage.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoyageLogRepository {
    void save(VoyageLog voyageLog);

    Optional<VoyageLog> findById(Long logId);

    List<VoyageLog> findAllByUserId(Long userId);

    @Query("SELECT COUNT(DISTINCT v.toCity.id) FROM VoyageLog v WHERE v.userId = :userId")
    Long countDistinctToCityByUserId(@Param("userId") Long userId);
}
