package org.example.drift_log.trace.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class TraceException extends DriftLogException {
    private final TraceErrorCode errorCode;

    public TraceException(TraceErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}