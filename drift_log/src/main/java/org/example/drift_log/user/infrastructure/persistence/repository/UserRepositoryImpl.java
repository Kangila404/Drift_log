package org.example.drift_log.user.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepository {

    private final UserJpaRepository userJpaRepository;

    @Override
    public void save(User user) {
        userJpaRepository.save(user);
    }

    @Override
    public Optional<User> findById(Long id) {
        return userJpaRepository.findById(id);
    }

    @Override
    public Optional<User> findByUserId(String userId) {
        return userJpaRepository.findByUserId(userId);
    }

    @Override
    public Long countByLastLoginAtAfter(LocalDateTime startOfDay) {
        return userJpaRepository.countByLastLoginAtAfter(startOfDay);
    }

    @Override
    public Long count() {
        return userJpaRepository.count();
    }

    @Override
    public List<User> findAll() {
        return userJpaRepository.findAll();
    }

    @Override
    public List<User> findAllById(List<Long> userIds) {
        return userJpaRepository.findAllById(userIds);
    }
}