package org.example.drift_log.user.presentation.dto.res;

import java.util.UUID;
import org.example.drift_log.user.domain.model.User;

public record LoginResponse(
    String userId,
    String accessToken,
    String refreshToken
) {

    public static LoginResponse from(User user, String  accessToken, String refreshToken) {
        return new LoginResponse(
            user.getUserId(),
            accessToken,
            refreshToken
        );
    }

}
