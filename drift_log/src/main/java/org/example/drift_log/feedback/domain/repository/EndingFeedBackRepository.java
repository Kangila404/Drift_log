package org.example.drift_log.feedback.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.feedback.domain.model.EndingFeedback;

public interface EndingFeedBackRepository {
    boolean existsByUserId(Long userId);

    void save(EndingFeedback feedback);

    List<EndingFeedback> findAll();

    Optional<EndingFeedback> findByUserId(Long userId);
}
