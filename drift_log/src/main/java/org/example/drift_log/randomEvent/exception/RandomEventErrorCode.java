package org.example.drift_log.randomEvent.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum RandomEventErrorCode {
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND, "이벤트가 없습니다.");
    private final HttpStatus status;
    private final String message;
}
