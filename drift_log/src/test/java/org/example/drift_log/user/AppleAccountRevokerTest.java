package org.example.drift_log.user;

import com.sun.net.httpserver.HttpServer;
import io.jsonwebtoken.Jwts;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.infrastructure.oauth.AppleAccountRevoker;
import org.example.drift_log.user.infrastructure.oauth.AppleTokenVerifier;
import org.example.drift_log.user.presentation.dto.req.DeleteAccountRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AppleAccountRevokerTest {
    HttpServer server;
    AppleAccountRevoker revoker;
    AppleTokenVerifier verifier;
    KeyPair keys;
    List<Map<String, String>> requests;
    int tokenStatus;
    int revokeStatus;
    String tokenBody;

    @BeforeEach
    void setup() throws Exception {
        requests = new ArrayList<>();
        tokenStatus = 200;
        revokeStatus = 200;
        tokenBody = "{\"id_token\":\"exchanged\",\"refresh_token\":\"apple-refresh\"}";
        var generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        keys = generator.generateKeyPair();
        String pem = "-----BEGIN PRIVATE KEY-----\n" + Base64.getEncoder().encodeToString(keys.getPrivate().getEncoded())
            + "\n-----END PRIVATE KEY-----";
        verifier = mock(AppleTokenVerifier.class);
        when(verifier.verify(anyString())).thenReturn(new AppleTokenVerifier.AppleUserInfo("owner", "email", "com.kangila.driftlog"));
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/auth", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            requests.add(Arrays.stream(body.split("&")).map(s -> s.split("=", 2))
                .collect(Collectors.toMap(pair -> pair[0], pair -> URLDecoder.decode(pair[1], StandardCharsets.UTF_8))));
            boolean token = exchange.getRequestURI().getPath().endsWith("/token");
            byte[] bytes = (token ? tokenBody : "").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(token ? tokenStatus : revokeStatus, bytes.length == 0 ? -1 : bytes.length);
            if (bytes.length > 0) exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        revoker = new AppleAccountRevoker(verifier, "TEST_TEAM", "TEST_KEY",
            Base64.getEncoder().encodeToString(pem.getBytes(StandardCharsets.UTF_8)),
            "http://127.0.0.1:" + server.getAddress().getPort() + "/auth", "https://driftlog.kro.kr");
    }

    @AfterEach void cleanup() { server.stop(0); }
    DeleteAccountRequest credentials() { return new DeleteAccountRequest("identity", "code+with/special=chars"); }

    @Test void exchangesCodeAndRevokesWithVerifiedSignedClientSecret() {
        revoker.revoke("owner", credentials());
        assertThat(requests).hasSize(2);
        assertThat(requests.get(0)).containsEntry("grant_type", "authorization_code")
            .containsEntry("code", credentials().appleAuthorizationCode()).doesNotContainKey("redirect_uri");
        var signed = Jwts.parserBuilder().setSigningKey(keys.getPublic()).build()
            .parseClaimsJws(requests.get(0).get("client_secret"));
        assertThat(signed.getHeader().getKeyId()).isEqualTo("TEST_KEY");
        assertThat(signed.getBody().getIssuer()).isEqualTo("TEST_TEAM");
        assertThat(signed.getBody().getSubject()).isEqualTo("com.kangila.driftlog");
        assertThat(signed.getBody().getAudience()).isEqualTo("https://appleid.apple.com");
        assertThat(signed.getBody().getExpiration().getTime() - signed.getBody().getIssuedAt().getTime()).isEqualTo(300000);
        assertThat(requests.get(1)).containsEntry("token", "apple-refresh").containsEntry("token_type_hint", "refresh_token");
    }

    @Test void missingProofDoesNotCallApple() {
        assertThatThrownBy(() -> revoker.revoke("owner", null)).isInstanceOf(UserException.class);
        assertThat(requests).isEmpty();
    }
    @Test void differentAccountDoesNotCallApple() {
        assertThatThrownBy(() -> revoker.revoke("different-owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).isEmpty();
    }
    @Test void codeBelongingToAnotherUserIsNotRevoked() {
        when(verifier.verify("exchanged")).thenReturn(new AppleTokenVerifier.AppleUserInfo("other", "email", "com.kangila.driftlog"));
        assertThatThrownBy(() -> revoker.revoke("owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).hasSize(1);
    }
    @Test void codeExchangeFailureDoesNotRevoke() {
        tokenStatus = 400;
        assertThatThrownBy(() -> revoker.revoke("owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).hasSize(1);
    }
    @Test void missingRefreshTokenFailsClosed() {
        tokenBody = "{\"id_token\":\"exchanged\"}";
        assertThatThrownBy(() -> revoker.revoke("owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).hasSize(1);
    }
    @Test void revocationFailureDoesNotReportSuccess() {
        revokeStatus = 500;
        assertThatThrownBy(() -> revoker.revoke("owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).hasSize(2);
    }
    @Test void missingSigningKeyFailsBeforeCallingApple() {
        var unconfigured = new AppleAccountRevoker(verifier, "", "", "", "http://127.0.0.1", "");
        assertThatThrownBy(() -> unconfigured.revoke("owner", credentials())).isInstanceOf(UserException.class);
        assertThat(requests).isEmpty();
    }
}
