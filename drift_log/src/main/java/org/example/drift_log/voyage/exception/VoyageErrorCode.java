package org.example.drift_log.voyage.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum VoyageErrorCode {
    USER_NOT_FOUND(HttpStatus.NOT_FOUND,                "존재하지 않는 유저입니다."),
    VOYAGE_STATUS_NOT_FOUND(HttpStatus.NOT_FOUND,       "항해 상태를 찾을 수 없습니다."),
    VOYAGE_LOG_NOT_FOUND(HttpStatus.NOT_FOUND,          "해당 항해 기록을 조회할 수 없습니다."),
    VOYAGE_LOG_NOT_OWNER(HttpStatus.FORBIDDEN,          "해당 유저가 작성한 항해 일지가 아닙니다."),
    NOT_SAILING(HttpStatus.BAD_REQUEST,                 "현재 항해 중이 아닙니다."),
    NOT_ANCHORED(HttpStatus.BAD_REQUEST,                "현재 정박 중이 아닙니다."),
    NOT_PAUSED(HttpStatus.BAD_REQUEST,                  "일시정지 중이 아닙니다."),
    NOT_ARRIVED(HttpStatus.BAD_REQUEST,                 "도착 상태가 아닙니다."),
    SAME_CITY(HttpStatus.BAD_REQUEST,                   "같은 도시로 이동할 수 없습니다."),
    CITY_NOT_FOUND(HttpStatus.NOT_FOUND,                "해당 도시는 존재하지 않습니다."),
    CITY_INVALID(HttpStatus.NOT_FOUND,                  "존재하지 않는 도시입니다."),
    CITY_ROUTE_NOT_FOUND(HttpStatus.NOT_FOUND,          "해당 경로가 존재하지 않습니다."),
    EVENT_NOT_FOUND(HttpStatus.NOT_FOUND,               "존재하지 않는 이벤트입니다.");

    private final HttpStatus status;
    private final String message;
}
