package org.example.drift_log.voyage.domain.repository;

import org.example.drift_log.voyage.domain.entity.VoyageLog;

public interface VoyageLogRepository {
    public void save(VoyageLog voyageLog);
}
