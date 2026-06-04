package org.example.drift_log.voyage.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class VoyageException extends DriftLogException {
    private final VoyageErrorCode errorCode;

    public VoyageException(VoyageErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}