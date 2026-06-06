package org.example.drift_log.trace.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum TraceErrorCode {
    TRACE_NOT_FOUND(HttpStatus.NOT_FOUND, "흔적이 존재하지 않습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 유저가 존재하지 않습니다.");

    private final HttpStatus status;
    private final String message;
}
