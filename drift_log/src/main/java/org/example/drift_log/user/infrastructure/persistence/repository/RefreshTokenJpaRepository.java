package org.example.drift_log.user.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenJpaRepository extends JpaRepository<RefreshToken,Long> {

    void deleteByToken(String token);

    void deleteByUserId(Long userId);

    Optional<RefreshToken> findByUserId(Long userId);

    Optional<RefreshToken> findByToken(String token);
}
