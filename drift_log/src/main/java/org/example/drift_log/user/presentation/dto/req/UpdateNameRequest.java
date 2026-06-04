package org.example.drift_log.user.presentation.dto.req;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNameRequest(
    @NotBlank @Size(max = 20) String name
) {

}
