package org.example.drift_log.user.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserJpaRepository extends JpaRepository<User,Long> {

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    Optional<User> findByUserId(String userId);



}
