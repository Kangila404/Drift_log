package org.example.drift_log.customerCenter.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum CustomerCenterErrorCode {

    NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "공지사항을 찾을 수 없습니다."),
    INQUIRY_NOT_FOUND(HttpStatus.NOT_FOUND, "질문을 찾을 수 없습니다."),
    ANSWER_NOT_FOUND(HttpStatus.NOT_FOUND, "답변을 찾을 수 없습니다."),
    ALREADY_ANSWERED(HttpStatus.CONFLICT, "이미 답변이 등록된 질문입니다."),
    INVALID_INQUIRY_ACCESS(HttpStatus.FORBIDDEN, "해당 질문의 작성자가 아닙니다.");

    private final HttpStatus status;
    private final String message;
}