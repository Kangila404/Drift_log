package org.example.drift_log.admin.presentation.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateVersionRequest(
    @NotBlank(message = "버전 문자열은 비어 있을 수 없습니다.")
    @Size(max = 10, message = "버전 문자열은 10글자를 초과할 수 없습니다.")
    String version
) {

}
