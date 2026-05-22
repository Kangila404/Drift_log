package org.example.drift_log.randomEvent.domain.repository;

import org.example.drift_log.randomEvent.domain.model.VoyageEvent;

public interface VoyageEventRepository {
    void save(VoyageEvent voyageEvent);
}
