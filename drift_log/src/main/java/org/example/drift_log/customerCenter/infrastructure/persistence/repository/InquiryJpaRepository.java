package org.example.drift_log.customerCenter.infrastructure.persistence.repository;

import java.util.List;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryJpaRepository extends JpaRepository<Inquiry, Long> {
    List<Inquiry> findAllByAuthorId(Long authorId);
}
