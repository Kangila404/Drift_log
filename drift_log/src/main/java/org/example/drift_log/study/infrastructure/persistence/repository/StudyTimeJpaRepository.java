package org.example.drift_log.study.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.example.drift_log.study.domain.model.StudyTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyTimeJpaRepository extends JpaRepository<StudyTime, Long> {

    @Query(value = """
            SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, study_start_time_at, study_end_time_at)), 0)
            FROM study_time
            WHERE user_id = :userId
            """, nativeQuery = true)
    long sumTotalSecondsByUserId(@Param("userId") Long userId);


    @Query(value = """
            SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, study_start_time_at, study_end_time_at)), 0)
            FROM study_time
            WHERE user_id = :userId
              AND study_end_time_at >= :start
              AND study_end_time_at < :end
            """, nativeQuery = true)
    Long sumSecondsBetweenByUserId(
        @Param("userId") Long userId,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end);

    List<StudyTime> findByUser_IdOrderByStudyStartTimeAtDesc(Long userId);
}
