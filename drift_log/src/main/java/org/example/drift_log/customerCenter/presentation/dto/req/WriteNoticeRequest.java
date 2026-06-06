package org.example.drift_log.customerCenter.presentation.dto.req;

import jakarta.validation.constraints.NotBlank;

public record WriteNoticeRequest(
    @NotBlank(message = "제목은 필수입니다.")
    String title,

    @NotBlank(message = "내용을 입력하세요.")
    String content
) {

}
