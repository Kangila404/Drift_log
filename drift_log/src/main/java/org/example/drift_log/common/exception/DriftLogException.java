package org.example.drift_log.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class DriftLogException extends RuntimeException {
    private final HttpStatus status;
    private final String message;

    public DriftLogException(HttpStatus status, String message) {
        super(message);
        this.status = status;
        this.message = message;
    }
}

