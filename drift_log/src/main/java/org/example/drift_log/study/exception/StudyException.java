package org.example.drift_log.study.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;
import org.example.drift_log.feedback.exception.FeedbackErrorCode;

@Getter
public class StudyException extends DriftLogException {

    private final StudyErrorCode errorCode;

    public StudyException(StudyErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
