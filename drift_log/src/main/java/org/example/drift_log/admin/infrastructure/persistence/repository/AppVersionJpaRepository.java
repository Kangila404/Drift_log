package org.example.drift_log.admin.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.admin.domain.model.AppVersion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppVersionJpaRepository extends JpaRepository<AppVersion,Long> {
    Optional<AppVersion> findTopByOrderByIdDesc();
}
