package org.example.drift_log.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ── 공통 ──────────────────────────────────────────
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST,       "잘못된 입력값입니다."),
    INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST,        "잘못된 타입입니다."),
    MISSING_PARAMETER(HttpStatus.BAD_REQUEST,         "필수 파라미터가 누락되었습니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND,          "요청한 리소스를 찾을 수 없습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "허용되지 않는 HTTP 메서드입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN,               "접근 권한이 없습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED,             "인증이 필요합니다.");

    private final HttpStatus status;
    private final String message;

}
