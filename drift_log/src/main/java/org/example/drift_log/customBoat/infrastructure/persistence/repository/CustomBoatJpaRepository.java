package org.example.drift_log.customBoat.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.customBoat.domain.model.CustomBoat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomBoatJpaRepository extends JpaRepository<CustomBoat, Long> {

    Optional<CustomBoat> findByUserId(Long userId);
}
