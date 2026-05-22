package org.example.drift_log.user.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import org.example.drift_log.user.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserJpaRepository extends JpaRepository<User,Long> {

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    Optional<User> findByUserId(String userId);

    @Query(value = "SELECT COUNT(*) FROM users WHERE last_login_at >= :startOfDay", nativeQuery = true)
    Long countByLastLoginAtAfter(LocalDateTime startOfDay);



}
