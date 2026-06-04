package org.example.drift_log.user.presentation.dto.res;

import org.example.drift_log.user.domain.model.User;

public record SocialLoginResponse(
    String userId,
    String accessToken,
    String refreshToken
) {

    public static SocialLoginResponse from(User user, String accessToken, String refreshToken){
        return new SocialLoginResponse(
            user.getUserId(),
            accessToken,
            refreshToken
        );
    }

}
