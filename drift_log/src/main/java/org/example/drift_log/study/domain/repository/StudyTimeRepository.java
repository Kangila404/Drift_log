package org.example.drift_log.study.domain.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.drift_log.study.domain.model.StudyTime;

public interface StudyTimeRepository {
    void save(StudyTime studyTime);

    Long sumTotalSecondsByUserId(Long userId);

    Long sumSecondsBetweenByUserId(Long userId, LocalDateTime start, LocalDateTime end);

    List<StudyTime> findByUserOrderByStartTimeDesc(Long userId);

    Optional<StudyTime> findById(Long id);

    void deleteById(Long id);
}
