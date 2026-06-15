package org.example.drift_log.user.infrastructure.oauth;

import com.google.auth.oauth2.TokenVerifier;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;


@Component
public class AppleTokenVerifier {

    // 앱(네이티브)·웹 각각의 클라이언트 ID(aud). 콤마로 여러 개 허용
    @Value("${apple.client-ids}")
    private String appleClientIds;

    public AppleUserInfo verify(String identityToken) {
        try {
            TokenVerifier verifier = TokenVerifier.newBuilder()
                .setCertificatesLocation("https://appleid.apple.com/auth/keys")
                .setIssuer("https://appleid.apple.com")
                .build();

            // 서명·만료·issuer 검증
            var jwt = verifier.verify(identityToken);
            var payload = jwt.getPayload();

            // aud(클라이언트 ID) 수동 검증 — 등록된 ID 중 하나와 일치해야 함
            String aud = (String) payload.get("aud");
            if (aud == null || !isAllowedAudience(aud)) {
                throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
            }

            String sub = (String) payload.get("sub");
            if (sub == null) {
                throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
            }

            String email = (String) payload.get("email");

            return new AppleUserInfo(sub, email);
        } catch (UserException e) {
            throw e;
        } catch (Exception e) {
            throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
        }
    }

    private boolean isAllowedAudience(String aud) {
        for (String allowed : appleClientIds.split(",")) {
            if (allowed.trim().equals(aud)) {
                return true;
            }
        }
        return false;
    }

    public record AppleUserInfo(String sub, String email) {}
}