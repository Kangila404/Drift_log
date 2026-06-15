package org.example.drift_log.user.presentation.dto.req;

import jakarta.validation.constraints.NotBlank;

public record AppleLoginRequest(
    @NotBlank String identityToken,
    String name
) {}
