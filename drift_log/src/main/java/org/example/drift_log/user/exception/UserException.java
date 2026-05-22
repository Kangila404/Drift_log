package org.example.drift_log.user.exception;

import org.example.drift_log.common.exception.DriftLogException;
import org.example.drift_log.common.exception.ErrorCode;

public class UserException extends DriftLogException {
    public UserException(UserErrorCode code) {
        super(code.getStatus(), code.getMessage());
    }
}