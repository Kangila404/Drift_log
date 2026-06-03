package org.example.drift_log.user.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum UserErrorCode {
    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT,        "이메일이 이미 존재합니다."),
    PASSWORD_NOT_MATCHED(HttpStatus.BAD_REQUEST,     "비밀번호와 비밀번호 확인이 일치하지 않습니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND,             "로그인 실패입니다."),
    USER_NOT_FOUND_BY_ID(HttpStatus.NOT_FOUND,       "해당 토큰에 해당하는 유저가 없습니다."),
    USER_SUSPENDED(HttpStatus.FORBIDDEN,             "정지된 유저입니다."),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED,        "비밀번호가 틀립니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED,   "리프레시 토큰이 올바르지 않습니다."),
    EXPIRED_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED,   "날짜가 지난 리프레시 토큰입니다."),
    INVALID_SOCIAL_TOKEN(HttpStatus.UNAUTHORIZED, "유효하지 않은 소셜 로그인 토큰입니다."),
    INVALID_AUTHTYPE(HttpStatus.UNAUTHORIZED, "해당 방식으로 가입한 회원이 아닙니다.");
    private final HttpStatus status;
    private final String message;
}
