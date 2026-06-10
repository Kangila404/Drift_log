package org.example.drift_log.user.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;
import org.example.drift_log.user.domain.repository.AuthIdentityRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AuthIdentityRepositoryImpl implements AuthIdentityRepository {

    private final AuthIdentityJpaRepository authIdentityJpaRepository;

    @Override
    public Optional<AuthIdentity> findByProviderAndProviderId(AuthType provider, String providerId) {

        return authIdentityJpaRepository.findByProviderAndProviderId(provider, providerId);
    }

    @Override
    public Optional<AuthIdentity> findByUserIdAndProvider(Long userId, AuthType provider) {
        return authIdentityJpaRepository.findByUser_IdAndProvider(userId, provider);
    }

    @Override
    public Optional<AuthIdentity> findFirstByUserId(Long userId) {
        return authIdentityJpaRepository.findFirstByUser_Id(userId);
    }

    @Override
    public void save(AuthIdentity authIdentity) {
        authIdentityJpaRepository.save(authIdentity);
    }
}
