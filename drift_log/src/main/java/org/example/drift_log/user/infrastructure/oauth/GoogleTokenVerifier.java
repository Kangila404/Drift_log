package org.example.drift_log.user.infrastructure.oauth;

import com.google.auth.oauth2.TokenVerifier;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GoogleTokenVerifier {

    @Value("${google.client-id}")
    private String googleClientId;

    public GoogleUserInfo verify(String idTokenString){

    try {
        TokenVerifier verifier = TokenVerifier.newBuilder()
            .setAudience(googleClientId)
            .setIssuer("https://accounts.google.com")
            .build();

        // 검증 통과 -> jwt 반환
        var jwt = verifier.verify(idTokenString);

        // payload에서 email, name 추출
        var payload = jwt.getPayload();

        String sub = (String) payload.get("sub");
        String email = (String)payload.get("email");
        Object nameObj = payload.get("name");
        String name = nameObj != null ? nameObj.toString() : email.split("@")[0];

        if(sub == null){
            throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
        }

        return new GoogleUserInfo(sub, email, name);
    } catch (Exception e) {
        throw new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN);
        }
    }

    public record GoogleUserInfo(String sub, String email, String name){}

}
