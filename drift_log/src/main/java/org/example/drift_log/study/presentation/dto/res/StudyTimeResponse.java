package org.example.drift_log.study.presentation.dto.res;

import java.time.LocalDateTime;
import org.example.drift_log.study.domain.model.StudyTime;

public record StudyTimeResponse(
    Long id,
    LocalDateTime studyStartTimeAt,
    LocalDateTime studyEndTimeAt,
    String subject
) {
    public static StudyTimeResponse from(StudyTime studyTime) {
        return new StudyTimeResponse(
            studyTime.getId(),
            studyTime.getStudyStartTimeAt(),
            studyTime.getStudyEndTimeAt(),
            studyTime.getSubject()
        );
    }
}
