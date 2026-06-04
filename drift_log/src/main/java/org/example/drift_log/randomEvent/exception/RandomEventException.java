package org.example.drift_log.randomEvent.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class RandomEventException extends DriftLogException {
    private final RandomEventErrorCode errorCode;

    public RandomEventException(RandomEventErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
