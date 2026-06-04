package org.example.drift_log.user.presentation.dto.req;

import org.example.drift_log.user.domain.enums.AuthType;

public record SocialLoginRequest(
    String idToken,
    AuthType authType
) {
}
