package org.example.drift_log.feedback.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class FeedbackException extends DriftLogException {
    private final FeedbackErrorCode errorCode;

    public FeedbackException(FeedbackErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
