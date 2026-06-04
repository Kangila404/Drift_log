package org.example.drift_log.admin.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;
import org.springframework.http.HttpStatus;

@Getter
public class AdminException extends DriftLogException {

    private final AdminErrorCode errorCode;

    public AdminException(AdminErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
