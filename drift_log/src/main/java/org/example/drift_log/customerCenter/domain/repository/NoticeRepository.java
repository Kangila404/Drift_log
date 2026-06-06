package org.example.drift_log.customerCenter.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.customerCenter.domain.model.Notice;

public interface NoticeRepository {
    List<Notice> findAll();

    Notice save(Notice notice);

    Optional<Notice> findById(Long noticeId);

    void deleteById(Long noticeId);
}
