package org.example.drift_log.customBoat.domain.repository;

import java.util.Optional;
import org.example.drift_log.customBoat.domain.model.CustomBoat;

public interface CustomBoatRepository {
    Optional<CustomBoat> findByUserId(Long userId);

    void save(CustomBoat customBoat);
}
