package org.example.drift_log.study.infrastructure.persistence.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.study.domain.model.StudyTime;
import org.example.drift_log.study.domain.repository.StudyTimeRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class StudyTimeRepositoryImpl implements StudyTimeRepository {

    private final StudyTimeJpaRepository studyTimeJpaRepository;


    @Override
    public void save(StudyTime studyTime) {
        studyTimeJpaRepository.save(studyTime);
    }

    @Override
    public Long sumTotalSecondsByUserId(Long userId) {
        return studyTimeJpaRepository.sumTotalSecondsByUserId(userId);
    }

    @Override
    public Long sumSecondsBetweenByUserId(Long userId, LocalDateTime start, LocalDateTime end) {
        return studyTimeJpaRepository.sumSecondsBetweenByUserId(userId, start, end);
    }

    @Override
    public List<StudyTime> findByUserOrderByStartTimeDesc(Long userId) {
        return studyTimeJpaRepository.findByUser_IdOrderByStudyStartTimeAtDesc(userId);
    }

    @Override
    public Optional<StudyTime> findById(Long id) {
        return studyTimeJpaRepository.findById(id);
    }

    @Override
    public void deleteById(Long id) {
        studyTimeJpaRepository.deleteById(id);
    }
}
