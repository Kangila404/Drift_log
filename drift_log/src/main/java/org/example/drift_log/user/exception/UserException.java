package org.example.drift_log.user.exception;

import org.example.drift_log.common.exception.DriftLogException;
import org.example.drift_log.common.exception.ErrorCode;

public class UserException extends DriftLogException {
    private final UserErrorCode errorCode;

    public UserException(UserErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public UserErrorCode getErrorCode() {
        return errorCode;
    }
}