package org.example.drift_log.weather.exception;

import lombok.Getter;
import org.example.drift_log.common.exception.DriftLogException;

@Getter
public class WeatherException extends DriftLogException {
    private final WeatherErrorCode errorCode;

    public WeatherException(WeatherErrorCode errorCode) {
        super(errorCode.getStatus(), errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
