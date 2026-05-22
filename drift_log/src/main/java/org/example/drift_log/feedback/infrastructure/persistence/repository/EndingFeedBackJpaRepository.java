package org.example.drift_log.feedback.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.feedback.domain.model.EndingFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EndingFeedBackJpaRepository extends JpaRepository<EndingFeedback,Long> {

   boolean existsByUserId(Long userId);

   Optional<EndingFeedback> findByUserId(Long userId);
}
