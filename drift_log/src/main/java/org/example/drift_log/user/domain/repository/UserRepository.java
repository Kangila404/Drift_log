package org.example.drift_log.user.domain.repository;

import java.util.Optional;
import org.example.drift_log.user.domain.model.User;

public interface UserRepository {

    void save(User user);

    boolean existsByEmail(String email);

    Optional<User> findByEmail(String email);

    Optional<User> findById(Long id);

    Optional<User> findByUserId(String userId);

}
