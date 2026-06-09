package org.example.drift_log.user.infrastructure.oauth;

import com.google.common.net.HttpHeaders;
import java.util.Map;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Component
public class KakaoClient {

    @Value("${kakao.client-id}")
    private String clientId;

    @Value("${kakao.client-secret}")
    private String clientSecret;

    @Value("${kakao.redirect-uri}")
    private String redirectUri;

    private final RestClient restClient = RestClient.create();

        public String getAccessToken(String code) {
            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("grant_type", "authorization_code");
            body.add("client_id", clientId);
            body.add("redirect_uri", redirectUri);
            body.add("code", code);
            body.add("client_secret", clientSecret);

            try {
                Map<String, Object> response = restClient.post()
                    .uri("https://kauth.kakao.com/oauth/token")
                    .header(HttpHeaders.CONTENT_TYPE, "application/x-www-form-urlencoded;charset=utf-8")
                    .body(body)
                    .retrieve()
                    .body(Map.class);

                if (response == null || response.get("access_token") == null) {
                    throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
                }
                return response.get("access_token").toString();
            } catch (UserException e) {
                throw e;
            } catch (Exception e) {
                throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
            }
        }

    @SuppressWarnings("unchecked")
    public KakaoUserInfo getUserInfo(String accessToken) {
        try {
            Map<String, Object> response = restClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header(HttpHeaders.CONTENT_TYPE,
                    MediaType.APPLICATION_FORM_URLENCODED_VALUE + ";charset=utf-8")
                .retrieve()
                .body(Map.class);

            if (response == null || response.get("id") == null) {
                throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
            }

            // 회원번호 (providerId)
            String kakaoId = String.valueOf(response.get("id"));

            // 닉네임 / email 추출 (동의 안 했으면 null)
            String nickname = null;
            String email = null;

            Map<String, Object> kakaoAccount = (Map<String, Object>) response.get("kakao_account");
            if (kakaoAccount != null) {
                email = (String) kakaoAccount.get("email");   // 일반앱이면 보통 null
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                if (profile != null) {
                    nickname = (String) profile.get("nickname");
                }
            }

            // 닉네임 fallback
            if (nickname == null || nickname.isBlank()) {
                nickname = "이름 없는 항해자";
            }

            return new KakaoUserInfo(kakaoId, email, nickname);
        } catch (UserException e) {
            throw e;
        } catch (Exception e) {
            throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
        }
    }

    public record KakaoUserInfo(String kakaoId, String email, String nickname) {}
}


