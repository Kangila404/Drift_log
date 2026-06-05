package org.example.drift_log.study.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.study.domain.model.StudyTime;
import org.example.drift_log.study.domain.repository.StudyTimeRepository;
import org.example.drift_log.study.exception.StudyErrorCode;
import org.example.drift_log.study.exception.StudyException;
import org.example.drift_log.study.presentation.dto.req.StudyTimeRequest;
import org.example.drift_log.study.presentation.dto.res.StudySummaryResponse;
import org.example.drift_log.study.presentation.dto.res.StudyTimeResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.ZoneId;
@Service
@Transactional
@RequiredArgsConstructor
public class StudyTimeServiceImpl implements StudyTimeService {

    private final StudyTimeRepository studyTimeRepository;
    private final UserRepository userRepository;
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");


    @Override
    public StudyTimeResponse save(String userId, StudyTimeRequest request) {

        User user = findUserByUserId(userId);

        StudyTime studyTime = StudyTime.builder()
            .user(user)
            .studyStartTimeAt(request.studyStartTimeAt())
            .studyEndTimeAt(request.studyEndTimeAt())
            .subject(request.subject())
            .build();

        studyTimeRepository.save(studyTime);
        return StudyTimeResponse.from(studyTime);
    }

    @Transactional(readOnly = true)
    @Override
    public StudySummaryResponse getSummary(String userId) {

        User user = findUserByUserId(userId);

        LocalDate today = LocalDate.now(KST);
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        long todaySeconds = studyTimeRepository.sumSecondsBetweenByUserId(user.getId(), start, end);
        long totalSeconds = studyTimeRepository.sumTotalSecondsByUserId(user.getId());

        return new StudySummaryResponse(todaySeconds, totalSeconds);
    }

    @Override
    public List<StudyTimeResponse> getLogs(String userId) {
        User user = findUserByUserId(userId);
        return studyTimeRepository.findByUserOrderByStartTimeDesc(user.getId())
            .stream()
            .map(StudyTimeResponse::from)
            .toList();
    }

    @Override
    public StudyTimeResponse updateSubject(String userId, Long studyTimeId, String subject) {
        User user = findUserByUserId(userId);
        StudyTime studyTime = findOwnedStudyTime(studyTimeId, user.getId());
        studyTime.update(subject != null ? subject.trim() : null);
        return StudyTimeResponse.from(studyTime);
    }

    @Override
    public void delete(String userId, Long studyTimeId) {
        User user = findUserByUserId(userId);
        StudyTime studyTime = findOwnedStudyTime(studyTimeId, user.getId());
        studyTimeRepository.deleteById(studyTime.getId());
    }


    // =========== 메서드 =========== //
    // 1. (String) userId -> User 조회
    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND_BY_ID));
    }

    // 2. 본인 기록인지 검증
    private StudyTime findOwnedStudyTime(Long studyTimeId, Long userId) {
        StudyTime studyTime = studyTimeRepository.findById(studyTimeId)
            .orElseThrow(() -> new StudyException(StudyErrorCode.STUDY_TIME_NOT_FOUND));

        if (!studyTime.getUser().getId().equals(userId)) {
            throw new StudyException(StudyErrorCode.INVALID_OWNED_STUDY_TIME);
        }
        return studyTime;
    }

}
