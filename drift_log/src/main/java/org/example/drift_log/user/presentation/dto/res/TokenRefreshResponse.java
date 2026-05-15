package org.example.drift_log.user.presentation.dto.res;

public record TokenRefreshResponse(
    String refreshToken,
    String accessToken
) {
    public static TokenRefreshResponse from(String refreshToken, String accessToken){
        return new TokenRefreshResponse(refreshToken, accessToken);
    }
}
