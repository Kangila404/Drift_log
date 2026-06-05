package org.example.drift_log.study.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum StudyErrorCode {

    INVALID_OWNED_STUDY_TIME(HttpStatus.UNAUTHORIZED, "해당 공부 일지의 소유자가 아닙니다."),
    STUDY_TIME_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 공부일지를 찾을 수 없습니다.");
    private final HttpStatus status;
    private final String message;
}
