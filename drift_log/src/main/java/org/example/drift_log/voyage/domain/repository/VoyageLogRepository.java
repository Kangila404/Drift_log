package org.example.drift_log.voyage.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.voyage.domain.entity.VoyageLog;

public interface VoyageLogRepository {
    void save(VoyageLog voyageLog);

    Optional<VoyageLog> findById(Long logId);

    List<VoyageLog> findAllByUserId(Long userId);
}
