package org.example.drift_log.study.presentation.dto.req;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public record StudyTimeRequest(
    @NotNull
    LocalDateTime studyStartTimeAt,

    @NotNull
    LocalDateTime studyEndTimeAt,

    String subject
) {

}
