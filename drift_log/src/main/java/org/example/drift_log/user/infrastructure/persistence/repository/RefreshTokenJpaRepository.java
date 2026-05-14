package org.example.drift_log.user.infrastructure.persistence.repository;

import org.example.drift_log.user.domain.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenJpaRepository extends JpaRepository<RefreshToken,Long> {

}
