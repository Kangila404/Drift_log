package org.example.drift_log.feedback.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum FeedbackErrorCode {
    USER_NOT_FOUND(HttpStatus.NOT_FOUND,          "해당 유저를 찾을 수 없습니다."),
    FEEDBACK_ALREADY_EXISTS(HttpStatus.CONFLICT,  "이미 피드백이 존재합니다.");

    private final HttpStatus status;
    private final String message;
}