package org.example.drift_log.user.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthIdentityJpaRepository extends JpaRepository<AuthIdentity, Long> {

    Optional<AuthIdentity> findByProviderAndProviderId(AuthType provider, String providerId);

    Optional<AuthIdentity> findByUser_IdAndProvider(Long userId, AuthType provider);

    Optional<AuthIdentity> findFirstByUser_Id(Long userId);
}
