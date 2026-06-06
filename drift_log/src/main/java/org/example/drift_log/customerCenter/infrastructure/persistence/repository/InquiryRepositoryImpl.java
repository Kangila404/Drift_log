package org.example.drift_log.customerCenter.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.example.drift_log.customerCenter.domain.repository.InquiryRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class InquiryRepositoryImpl implements InquiryRepository {

    private final InquiryJpaRepository inquiryJpaRepository;

    @Override
    public List<Inquiry> findAll() {
        return inquiryJpaRepository.findAll();
    }

    @Override
    public List<Inquiry> findAllByAuthorId(Long authorId) {
        return inquiryJpaRepository.findAllByAuthorId(authorId);
    }

    @Override
    public void save(Inquiry inquiry) {
        inquiryJpaRepository.save(inquiry);
    }

    @Override
    public Optional<Inquiry> findById(Long inquiryId) {
        return inquiryJpaRepository.findById(inquiryId);
    }

    @Override
    public void deleteById(Long inquiryId) {
        inquiryJpaRepository.deleteById(inquiryId);
    }
}
