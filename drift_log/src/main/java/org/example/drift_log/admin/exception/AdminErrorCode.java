package org.example.drift_log.admin.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum AdminErrorCode {
    ADMIN_USER_NOT_FOUND(HttpStatus.NOT_FOUND,       "해당 유저는 존재하지 않습니다."),
    VOYAGE_STATUS_NOT_FOUND(HttpStatus.NOT_FOUND,    "항해 상태를 찾을 수 없습니다."),
    VERSION_NOT_FOUND(HttpStatus.NOT_FOUND, "앱 버전을 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String message;
}
