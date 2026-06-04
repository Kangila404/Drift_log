package org.example.drift_log.user.domain.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.model.RefreshToken;

public interface RefreshTokenRepository {

    void save(RefreshToken refreshToken);

    void deleteByUserId(Long userId);

    void deleteByToken(String token);

    Optional<RefreshToken> findByUserId(Long userId);

    Optional<RefreshToken> findByToken(String token);
}
