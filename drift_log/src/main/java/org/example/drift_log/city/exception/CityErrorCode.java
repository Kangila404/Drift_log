package org.example.drift_log.city.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CityErrorCode {
    USER_NOT_FOUND(HttpStatus.NOT_FOUND,          "유저를 찾을 수 없습니다."),
    VOYAGE_STATUS_NOT_FOUND(HttpStatus.NOT_FOUND, "항해 상태를 찾을 수 없습니다."),
    CITY_NOT_FOUND(HttpStatus.NOT_FOUND,          "도시를 찾을 수 없습니다."),
    UNKNOWN_VOYAGE_STATE(HttpStatus.INTERNAL_SERVER_ERROR, "알 수 없는 항해 상태입니다.");

    private final HttpStatus status;
    private final String message;
}
