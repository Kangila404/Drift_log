package org.example.drift_log.city.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;
import org.springframework.http.HttpStatus;

@Getter
public class CityException extends DriftLogException {
    private final CityErrorCode errorCode;

    public CityException(CityErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
