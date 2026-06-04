package org.example.drift_log.user.presentation.dto.res;

import java.util.UUID;
import org.example.drift_log.user.domain.model.User;

public record SignUpResponse(
    String userId,
    String accessToken,
    String refreshToken
) {

    public static SignUpResponse from(User user, String accessToken,  String refreshToken){
        return new SignUpResponse(
            user.getUserId(),
            accessToken,
            refreshToken
        );
    }
}
