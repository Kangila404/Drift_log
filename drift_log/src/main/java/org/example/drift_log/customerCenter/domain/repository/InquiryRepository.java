package org.example.drift_log.customerCenter.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.customerCenter.domain.model.Inquiry;

public interface InquiryRepository {
    List<Inquiry> findAll();

    List<Inquiry> findAllByAuthorId(Long authorId);

    void save(Inquiry inquiry);

    Optional<Inquiry> findById(Long inquiryId);

    void deleteById(Long inquiryId);
}
