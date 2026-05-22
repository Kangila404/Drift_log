package org.example.drift_log.voyage.domain.repository;

import java.util.Optional;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;

public interface VoyageStatusRepository {
    Optional<VoyageStatus> findByUserId(Long userId);
    void save(VoyageStatus voyageStatus);
    Long countClearUser();
}
