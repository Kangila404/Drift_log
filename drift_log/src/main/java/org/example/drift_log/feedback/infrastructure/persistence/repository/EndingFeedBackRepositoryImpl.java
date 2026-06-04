package org.example.drift_log.feedback.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.feedback.domain.model.EndingFeedback;
import org.example.drift_log.feedback.domain.repository.EndingFeedBackRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class EndingFeedBackRepositoryImpl implements EndingFeedBackRepository {

    private final EndingFeedBackJpaRepository endingFeedBackJpaRepository;

    @Override
    public boolean existsByUserId(Long userId) {
        return endingFeedBackJpaRepository.existsByUserId(userId);
    }

    @Override
    public void save(EndingFeedback feedback) {
        endingFeedBackJpaRepository.save(feedback);
    }

    @Override
    public List<EndingFeedback> findAll() {
        return endingFeedBackJpaRepository.findAll();
    }

    @Override
    public Optional<EndingFeedback> findByUserId(Long userId) {
        return endingFeedBackJpaRepository.findByUserId(userId);
    }
}
