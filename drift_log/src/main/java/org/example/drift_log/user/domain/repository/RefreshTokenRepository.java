package org.example.drift_log.user.domain.repository;

import org.example.drift_log.user.domain.model.RefreshToken;

public interface RefreshTokenRepository {

    void save(RefreshToken refreshToken);
}
