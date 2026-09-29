package org.example.drift_log.user.infrastructure.oauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.stream.Collectors;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.presentation.dto.req.DeleteAccountRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AppleAccountRevoker {
    private final AppleTokenVerifier verifier;
    private final String teamId;
    private final String keyId;
    private final String privateKeyBase64;
    private final String endpoint;
    private final String webRedirectUri;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper json = new ObjectMapper();

    public AppleAccountRevoker(AppleTokenVerifier verifier,
        @Value("${apple.team-id:}") String teamId,
        @Value("${apple.key-id:}") String keyId,
        @Value("${apple.private-key-base64:}") String privateKeyBase64,
        @Value("${apple.auth-url:https://appleid.apple.com/auth}") String endpoint,
        @Value("${apple.web-redirect-uri:https://driftlog.kro.kr}") String webRedirectUri) {
        this.verifier = verifier;
        this.teamId = teamId;
        this.keyId = keyId;
        this.privateKeyBase64 = privateKeyBase64;
        this.endpoint = endpoint;
        this.webRedirectUri = webRedirectUri;
    }

    public void revoke(String expectedSubject, DeleteAccountRequest request) {
        if (request == null || blank(request.appleIdentityToken()) || blank(request.appleAuthorizationCode())) {
            throw new UserException(UserErrorCode.APPLE_REAUTH_REQUIRED);
        }
        var identity = verifyOwner(request.appleIdentityToken(), expectedSubject);
        try {
            String clientId = identity.audience();
            String secret = clientSecret(clientId);
            var form = new java.util.HashMap<>(Map.of(
                "client_id", clientId, "client_secret", secret,
                "code", request.appleAuthorizationCode(), "grant_type", "authorization_code"));
            if (clientId.endsWith(".web")) form.put("redirect_uri", webRedirectUri);
            var response = post("/token", form);
            if (response.statusCode() != 200) throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
            JsonNode tokens = json.readTree(response.body());
            // Bind the code's owner too: an unrelated user's authorization code
            // must never be revoked, even alongside a valid identity token.
            var exchanged = verifyOwner(tokens.path("id_token").asText(), expectedSubject);
            if (!clientId.equals(exchanged.audience())) throw new UserException(UserErrorCode.APPLE_REAUTH_REQUIRED);
            String token = tokens.path("refresh_token").asText();
            if (blank(token)) throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
            var revoked = post("/revoke", Map.of("client_id", clientId, "client_secret", secret,
                "token", token, "token_type_hint", "refresh_token"));
            if (revoked.statusCode() != 200) throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
        } catch (UserException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
        } catch (Exception e) {
            // Never propagate request bodies, Apple tokens, or the signing key.
            throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
        }
    }

    private AppleTokenVerifier.AppleUserInfo verifyOwner(String token, String subject) {
        try {
            var identity = verifier.verify(token);
            if (!subject.equals(identity.sub())) throw new UserException(UserErrorCode.APPLE_REAUTH_REQUIRED);
            return identity;
        } catch (UserException e) {
            throw new UserException(UserErrorCode.APPLE_REAUTH_REQUIRED);
        }
    }

    private String clientSecret(String clientId) throws Exception {
        if (blank(teamId) || blank(keyId) || blank(privateKeyBase64)) {
            throw new UserException(UserErrorCode.APPLE_REVOCATION_FAILED);
        }
        String pem = new String(Base64.getDecoder().decode(privateKeyBase64), StandardCharsets.UTF_8);
        byte[] der = Base64.getDecoder().decode(pem.replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "").replaceAll("\\s", ""));
        PrivateKey key = KeyFactory.getInstance("EC").generatePrivate(new PKCS8EncodedKeySpec(der));
        Instant now = Instant.now();
        return Jwts.builder().setHeaderParam("kid", keyId).setIssuer(teamId)
            .setSubject(clientId).setAudience("https://appleid.apple.com")
            .setIssuedAt(Date.from(now)).setExpiration(Date.from(now.plusSeconds(300)))
            .signWith(key, SignatureAlgorithm.ES256).compact();
    }

    private HttpResponse<String> post(String path, Map<String, String> form) throws Exception {
        String body = form.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
            .collect(Collectors.joining("&"));
        return http.send(HttpRequest.newBuilder(URI.create(endpoint + path))
            .timeout(Duration.ofSeconds(10)).header("Content-Type", "application/x-www-form-urlencoded")
            .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
}
