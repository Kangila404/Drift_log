package org.example.drift_log.user.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.drift_log.user.domain.model.User;

public interface UserRepository {

    void save(User user);


    Optional<User> findById(Long id);

    Optional<User> findByUserId(String userId);

    Long countByLastLoginAtAfter(LocalDateTime startOfDay);

    Long count();

    List<User> findAll();

    List<User> findAllById(List<Long> userIds);

}
