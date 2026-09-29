package org.example.drift_log.user;

import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.example.drift_log.user.infrastructure.oauth.AppleAccountRevoker;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

import static org.assertj.core.api.Assertions.assertThat;

/** Real HTTP/security/service/database coverage; never uses the production DB. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:account-deletion;DB_CLOSE_DELAY=-1",
    "weather.scheduler.cron=-"
})
@ActiveProfiles("test")
class AccountDeletionIntegrationTest {
    @DynamicPropertySource
    static void isolatedMysql(DynamicPropertyRegistry properties) {
        // CI-only disposable MySQL. Never accept a production connection URL.
        if ("1".equals(System.getenv("RUN_MYSQL_ACCOUNT_TEST"))) {
            properties.add("spring.datasource.url", () -> "jdbc:mysql://127.0.0.1:3306/driftlog_account_test?allowPublicKeyRetrieval=true&useSSL=false");
            properties.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
            properties.add("spring.datasource.username", () -> "root");
            properties.add("spring.datasource.password", () -> "isolated-test-only");
        }
    }
    @LocalServerPort int port;
    @Autowired JdbcTemplate db;
    @MockitoBean AppleAccountRevoker appleRevoker;
    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void signupDeleteAndVerifyCommittedDataAndLogin() throws Exception {
        // JDBC fixtures bypass JPA auditing; keep its mandatory timestamps.
        for (String table : new String[]{"city", "trace", "study_time", "custom_boats", "ending_feedback",
                "voyage_log", "inquiry", "random_event", "voyage_event", "inquiry_answer", "notice"}) {
            db.execute("alter table " + table + " alter column created_at set default CURRENT_TIMESTAMP");
            db.execute("alter table " + table + " alter column updated_at set default CURRENT_TIMESTAMP");
        }
        db.update("insert into city (id,name,description,img_url,bgm_url,is_start_city) values (1,'Seoul','test','','',true)");
        db.update("insert into trace (id,city_id,name,family_member,content) values (5,1,'Test','MOM','test')");
        HttpResponse<String> signup = request("POST", "/auth/signup", null, signupBody("delete-test@example.com"));
        assertThat(signup.statusCode()).as(signup.body()).isEqualTo(200);
        String access = JsonPath.read(signup.body(), "$.accessToken");
        String refresh = JsonPath.read(signup.body(), "$.refreshToken");
        Long id = db.queryForObject("select user_id from auth_identities where email = ?", Long.class, "delete-test@example.com");

        HttpResponse<String> other = request("POST", "/auth/signup", null, signupBody("keep-test@example.com"));
        assertThat(other.statusCode()).as(other.body()).isEqualTo(200);
        String otherAccess = JsonPath.read(other.body(), "$.accessToken");
        Long otherId = db.queryForObject("select user_id from auth_identities where email = ?", Long.class, "keep-test@example.com");
        for (Long owner : new Long[]{id, otherId}) {
            db.update("insert into study_time (user_id,study_start_time_at,study_end_time_at,subject) values (?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'test')", owner);
            db.update("insert into custom_boats (user_id,sail,body,lantern) values (?,0,0,0)", owner);
            db.update("insert into ending_feedback (user_id,content) values (?,'test')", owner);
            db.update("insert into voyage_log (user_id,from_city_id,to_city_id,user_text) values (?,1,1,'test')", owner);
            db.update("insert into inquiry (author_id,title,content,inquiry_status) values (?,'test','test','ANSWERED')", owner);
            db.update("insert into notice (author_id,title,content) values (?,'test','test')", owner);
        }
        db.update("insert into random_event (id,name,text,cooldown_minutes) values (1,'test','test',1)");
        db.update("insert into voyage_event (voyage_log_id,random_event_id,occurred_at) select id,1,CURRENT_TIMESTAMP from voyage_log");
        // Both somebody else's reply to the deleted user and the deleted user's
        // reply to somebody else must be cleaned without deleting their inquiry.
        db.update("insert into inquiry_answer (inquiry_id,answerer_id,content) select id,?,'test' from inquiry where author_id = ?", otherId, id);
        db.update("insert into inquiry_answer (inquiry_id,answerer_id,content) select id,?,'test' from inquiry where author_id = ?", id, otherId);

        assertThat(request("GET", "/users/me", access, null).statusCode()).isEqualTo(200);
        // This endpoint does not load the caller itself. A stale JWT must be
        // rejected by security, even when the deleted account was an admin.
        db.update("update users set user_role = 'ADMIN' where id = ?", id);
        assertThat(request("GET", "/admin/notice", access, null).statusCode()).isEqualTo(200);
        assertThat(request("DELETE", "/users/me", null, null).statusCode()).isIn(401, 403);
        assertThat(count("users", "id", id)).isEqualTo(1);

        HttpResponse<String> deleted = request("DELETE", "/users/me", access, null);
        assertThat(deleted.statusCode()).as(deleted.body()).isEqualTo(204);
        for (String table : new String[]{"auth_identities", "refresh_token", "study_time", "custom_boats",
                "ending_feedback", "voyage_status", "discovered_trace", "voyage_log"}) {
            assertThat(count(table, "user_id", id)).as(table + " deleted account").isZero();
            assertThat(count(table, "user_id", otherId)).as(table + " unrelated account").isEqualTo(1);
        }
        assertThat(count("users", "id", id)).isZero();
        assertThat(count("inquiry", "author_id", id)).isZero();
        assertThat(count("inquiry", "author_id", otherId)).isEqualTo(1);
        assertThat(count("notice", "author_id", id)).isZero();
        assertThat(count("notice", "author_id", otherId)).isEqualTo(1);
        assertThat(db.queryForObject("select count(*) from inquiry_answer", Long.class)).isZero();
        assertThat(db.queryForObject("select inquiry_status from inquiry where author_id = ?", String.class, otherId)).isEqualTo("OPEN");
        assertThat(db.queryForObject("select count(*) from voyage_event", Long.class)).isEqualTo(1);

        assertThat(request("POST", "/auth/login", null,
            "{\"email\":\"delete-test@example.com\",\"password\":\"DeleteTest123!\"}").statusCode()).isBetween(400, 499);
        assertThat(request("POST", "/auth/reissue", null,
            "{\"refreshToken\":\"" + refresh + "\"}").statusCode()).isBetween(400, 499);
        assertThat(request("GET", "/users/me", access, null).statusCode()).isIn(401, 403);
        assertThat(request("GET", "/admin/notice", access, null).statusCode()).isIn(401, 403);
        assertThat(request("DELETE", "/users/me", access, null).statusCode()).isIn(401, 403);
        assertThat(request("GET", "/users/me", otherAccess, null).statusCode()).isEqualTo(200);
        assertThat(request("POST", "/auth/signup", null, signupBody("delete-test@example.com")).statusCode()).isEqualTo(200);
        verifyNoInteractions(appleRevoker);

        // Exercise the Apple branch through real HTTP and committed DB writes.
        // Only Apple's network boundary is mocked; its protocol has separate tests.
        db.update("update auth_identities set provider='APPLE', provider_id='apple-owner' where user_id=?", otherId);
        doThrow(new UserException(UserErrorCode.APPLE_REVOCATION_FAILED))
            .when(appleRevoker).revoke(eq("apple-owner"), any());
        String proof = "{\"appleIdentityToken\":\"identity\",\"appleAuthorizationCode\":\"code\"}";
        assertThat(request("DELETE", "/users/me", otherAccess, proof).statusCode()).isEqualTo(503);
        assertThat(count("users", "id", otherId)).isEqualTo(1);
        assertThat(count("study_time", "user_id", otherId)).isEqualTo(1);
        assertThat(count("refresh_token", "user_id", otherId)).isEqualTo(1);
        doNothing().when(appleRevoker).revoke(eq("apple-owner"), any());
        assertThat(request("DELETE", "/users/me", otherAccess, proof).statusCode()).isEqualTo(204);
        assertThat(count("users", "id", otherId)).isZero();
        assertThat(count("study_time", "user_id", otherId)).isZero();
        assertThat(request("GET", "/users/me", otherAccess, null).statusCode()).isIn(401, 403);
        verify(appleRevoker, times(2)).revoke(eq("apple-owner"), any());
    }

    private long count(String table, String column, Long id) {
        return db.queryForObject("select count(*) from " + table + " where " + column + " = ?", Long.class, id);
    }

    private String signupBody(String email) {
        return "{\"email\":\"" + email + "\",\"name\":\"DeleteTest\",\"password\":\"DeleteTest123!\",\"passwordConfirm\":\"DeleteTest123!\"}";
    }

    private HttpResponse<String> request(String method, String path, String token, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + path))
            .header("Content-Type", "application/json")
            .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
