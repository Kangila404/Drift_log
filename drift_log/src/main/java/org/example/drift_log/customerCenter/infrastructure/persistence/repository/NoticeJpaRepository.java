package org.example.drift_log.customerCenter.infrastructure.persistence.repository;

import org.example.drift_log.customerCenter.domain.model.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeJpaRepository extends JpaRepository<Notice,Long> {

}
