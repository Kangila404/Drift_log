package org.example.drift_log.customerCenter.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.domain.model.Notice;
import org.example.drift_log.customerCenter.domain.repository.NoticeRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class NoticeRepositoryImpl implements NoticeRepository {

    private final NoticeJpaRepository noticeJpaRepository;

    @Override
    public List<Notice> findAll() {
        return noticeJpaRepository.findAll();
    }

    @Override
    public Notice save(Notice notice) {
        return noticeJpaRepository.save(notice);
    }

    @Override
    public Optional<Notice> findById(Long noticeId) {
        return noticeJpaRepository.findById(noticeId);
    }

    @Override
    public void deleteById(Long noticeId) {
        noticeJpaRepository.deleteById(noticeId);
    }
}
