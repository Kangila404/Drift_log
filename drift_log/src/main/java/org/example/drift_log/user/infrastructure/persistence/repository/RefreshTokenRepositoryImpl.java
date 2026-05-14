package org.example.drift_log.user.infrastructure.persistence.repository;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.RefreshToken;
import org.example.drift_log.user.domain.repository.RefreshTokenRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepositoryImpl implements RefreshTokenRepository {

    private final RefreshTokenJpaRepository refreshTokenJpaRepository;

    @Override
    public void save(RefreshToken refreshToken) {
        refreshTokenJpaRepository.save(refreshToken);
    }
}
