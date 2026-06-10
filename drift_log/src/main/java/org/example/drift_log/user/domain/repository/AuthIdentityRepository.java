package org.example.drift_log.user.domain.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;

public interface AuthIdentityRepository {
    Optional<AuthIdentity> findByProviderAndProviderId(AuthType provider, String providerId);

    Optional<AuthIdentity> findByUserIdAndProvider(Long userId, AuthType provider);

    Optional<AuthIdentity> findFirstByUserId(Long userId);

    void save(AuthIdentity authIdentity);
}
