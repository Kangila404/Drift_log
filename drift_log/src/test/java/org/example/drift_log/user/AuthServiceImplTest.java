package org.example.drift_log.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.Optional;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.example.drift_log.user.application.AuthServiceImpl;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;
import org.example.drift_log.user.domain.model.RefreshToken;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.AuthIdentityRepository;
import org.example.drift_log.user.domain.repository.RefreshTokenRepository;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.infrastructure.jwt.JwtTokenProvider;
import org.example.drift_log.user.infrastructure.oauth.GoogleTokenVerifier;
import org.example.drift_log.user.infrastructure.oauth.KakaoClient;
import org.example.drift_log.user.presentation.dto.req.KakaoLoginRequest;
import org.example.drift_log.user.presentation.dto.req.LoginRequest;
import org.example.drift_log.user.presentation.dto.req.LogoutRequest;
import org.example.drift_log.user.presentation.dto.req.SignUpRequest;
import org.example.drift_log.user.presentation.dto.req.SocialLoginRequest;
import org.example.drift_log.user.presentation.dto.req.TokenRefreshRequest;
import org.example.drift_log.user.presentation.dto.res.LoginResponse;
import org.example.drift_log.user.presentation.dto.res.SocialLoginResponse;
import org.example.drift_log.user.presentation.dto.res.TokenRefreshResponse;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class AuthServiceImplTest {

    @InjectMocks
    private AuthServiceImpl authService;

    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private GoogleTokenVerifier googleTokenVerifier;
    @Mock private KakaoClient kakaoClient;
    @Mock private UserRepository userRepository;
    @Mock private AuthIdentityRepository authIdentityRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private VoyageStatusRepository voyageStatusRepository;
    @Mock private DiscoveredTraceRepository discoveredTraceRepository;
    @Mock private TraceRepository traceRepository;
    @Mock private CityRepository cityRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 유저(Long id, String name) {
        User user = User.createLocalUser(name);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private User 정지된유저(Long id) {
        User user = 유저(id, "정지유저");
        user.banUser();
        return user;
    }

    // AuthIdentity 픽스처 (user 연결 + id 주입)
    private AuthIdentity 인증수단(User user, AuthType provider, String providerId, String email) {
        AuthIdentity identity = provider == AuthType.LOCAL
            ? AuthIdentity.ofLocal(user, email, "encoded")
            : AuthIdentity.ofSocial(user, provider, providerId, email);
        ReflectionTestUtils.setField(identity, "id", 100L);
        return identity;
    }

    private RefreshToken 유효한토큰() {
        return RefreshToken.builder()
            .userId(1L).token("valid-token")
            .expirationAt(LocalDateTime.now().plusDays(7)).build();
    }

    private RefreshToken 만료된토큰() {
        return RefreshToken.builder()
            .userId(1L).token("expired-token")
            .expirationAt(LocalDateTime.now().minusDays(1)).build();
    }

    private Trace 서울흔적() {
        Trace trace = BeanUtils.instantiateClass(Trace.class);
        ReflectionTestUtils.setField(trace, "id", 5L);
        return trace;
    }

    private City 서울도시() {
        City city = BeanUtils.instantiateClass(City.class);
        ReflectionTestUtils.setField(city, "id", 1L);
        return city;
    }

    // ================================================================
    // 회원가입
    // ================================================================
    @Nested
    @DisplayName("회원가입")
    class 회원가입 {

        @Test
        @DisplayName("회원가입_정상_성공")
        void 회원가입_정상_성공() {
            // given
            SignUpRequest request = new SignUpRequest("test@test.com", "테스터", "password1!", "password1!");
            // 이메일 중복 체크 = LOCAL 인증수단 조회 (없음)
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "test@test.com"))
                .willReturn(Optional.empty());
            given(passwordEncoder.encode("password1!")).willReturn("encoded");
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());
            given(traceRepository.findById(5L)).willReturn(Optional.of(서울흔적()));
            given(cityRepository.findById(1L)).willReturn(Optional.of(서울도시()));

            // when
            authService.signup(request);

            // then
            verify(authIdentityRepository).save(any(AuthIdentity.class));
            verify(voyageStatusRepository).save(any());
            verify(discoveredTraceRepository).save(any());
        }

        @Test
        @DisplayName("회원가입_이메일_중복_예외")
        void 회원가입_이메일_중복_예외() {
            // given
            SignUpRequest request = new SignUpRequest("dup@test.com", "테스터", "password1!", "password1!");
            User user = 유저(1L, "테스터");
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "dup@test.com"))
                .willReturn(Optional.of(인증수단(user, AuthType.LOCAL, "dup@test.com", "dup@test.com")));

            // when & then
            assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.EMAIL_ALREADY_EXISTS));
        }

        @Test
        @DisplayName("회원가입_비밀번호_확인_불일치_예외")
        void 회원가입_비밀번호_확인_불일치_예외() {
            // given - 비번 불일치는 중복체크 통과 후 검사됨
            SignUpRequest request = new SignUpRequest("test@test.com", "테스터", "password1!", "different!");
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "test@test.com"))
                .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.PASSWORD_NOT_MATCHED));
        }
    }

    // ================================================================
    // 구글 로그인
    // ================================================================
    @Nested
    @DisplayName("구글로그인")
    class 구글로그인 {

        private final GoogleTokenVerifier.GoogleUserInfo googleUserInfo =
            new GoogleTokenVerifier.GoogleUserInfo("google-sub-123", "google@test.com", "구글유저");

        @Test
        @DisplayName("구글로그인_신규유저_정상_성공")
        void 구글로그인_신규유저_정상_성공() {
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google-sub-123"))
                .willReturn(Optional.empty());
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google@test.com"))
                .willReturn(Optional.empty());
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());
            given(traceRepository.findById(5L)).willReturn(Optional.of(서울흔적()));
            given(cityRepository.findById(1L)).willReturn(Optional.of(서울도시()));

            SocialLoginResponse response = authService.socialLogin(request);

            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("access-token");
            verify(authIdentityRepository).save(any(AuthIdentity.class));
            verify(voyageStatusRepository).save(any());
        }

        @Test
        @DisplayName("구글로그인_기존유저_sub조회_성공")
        void 구글로그인_기존유저_sub조회_성공() {
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            User existingUser = 유저(2L, "구글유저");
            AuthIdentity identity = 인증수단(existingUser, AuthType.GOOGLE, "google-sub-123", "google@test.com");

            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google-sub-123"))
                .willReturn(Optional.of(identity));
            given(userRepository.findById(2L)).willReturn(Optional.of(existingUser));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            SocialLoginResponse response = authService.socialLogin(request);

            assertThat(response).isNotNull();
            verify(authIdentityRepository, Mockito.never()).save(any(AuthIdentity.class));
        }

        @Test
        @DisplayName("구글로그인_기존유저_email교정_성공")
        void 구글로그인_기존유저_email교정_성공() {
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            User existingUser = 유저(2L, "구글유저");
            AuthIdentity legacy = 인증수단(existingUser, AuthType.GOOGLE, "google@test.com", "google@test.com");

            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google-sub-123"))
                .willReturn(Optional.empty());
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google@test.com"))
                .willReturn(Optional.of(legacy));
            given(userRepository.findById(2L)).willReturn(Optional.of(existingUser));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            SocialLoginResponse response = authService.socialLogin(request);

            assertThat(response).isNotNull();
            assertThat(legacy.getProviderId()).isEqualTo("google-sub-123");
            verify(authIdentityRepository).save(legacy);
            verify(voyageStatusRepository, Mockito.never()).save(any());
        }

        @Test
        @DisplayName("구글로그인_유효하지않은_토큰_예외")
        void 구글로그인_유효하지않은_토큰_예외() {
            SocialLoginRequest request = new SocialLoginRequest("bad-token", AuthType.GOOGLE);
            given(googleTokenVerifier.verify("bad-token"))
                .willThrow(new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN));

            assertThatThrownBy(() -> authService.socialLogin(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_SOCIAL_TOKEN));
        }

        @Test
        @DisplayName("구글로그인_정지된_유저_예외")
        void 구글로그인_정지된_유저_예외() {
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            User suspended = 정지된유저(2L);
            AuthIdentity identity = 인증수단(suspended, AuthType.GOOGLE, "google-sub-123", "google@test.com");

            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.GOOGLE, "google-sub-123"))
                .willReturn(Optional.of(identity));
            given(userRepository.findById(2L)).willReturn(Optional.of(suspended));

            assertThatThrownBy(() -> authService.socialLogin(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }

    // ================================================================
    // 카카오 로그인
    // ================================================================
    @Nested
    @DisplayName("카카오로그인")
    class 카카오로그인 {

        private final KakaoClient.KakaoUserInfo kakaoUserInfo =
            new KakaoClient.KakaoUserInfo("kakao-id-456", null, "이름 없는 항해자");

        @Test
        @DisplayName("카카오로그인_신규유저_정상_성공")
        void 카카오로그인_신규유저_정상_성공() {
            KakaoLoginRequest request = new KakaoLoginRequest("auth-code");
            given(kakaoClient.getAccessToken("auth-code")).willReturn("kakao-access-token");
            given(kakaoClient.getUserInfo("kakao-access-token")).willReturn(kakaoUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.KAKAO, "kakao-id-456"))
                .willReturn(Optional.empty());
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());
            given(traceRepository.findById(5L)).willReturn(Optional.of(서울흔적()));
            given(cityRepository.findById(1L)).willReturn(Optional.of(서울도시()));

            SocialLoginResponse response = authService.kakaoLogin(request);

            assertThat(response).isNotNull();
            verify(authIdentityRepository).save(any(AuthIdentity.class));
            verify(voyageStatusRepository).save(any());
        }

        @Test
        @DisplayName("카카오로그인_기존유저_정상_성공")
        void 카카오로그인_기존유저_정상_성공() {
            KakaoLoginRequest request = new KakaoLoginRequest("auth-code");
            User existingUser = 유저(3L, "카카오유저");
            AuthIdentity identity = 인증수단(existingUser, AuthType.KAKAO, "kakao-id-456", null);

            given(kakaoClient.getAccessToken("auth-code")).willReturn("kakao-access-token");
            given(kakaoClient.getUserInfo("kakao-access-token")).willReturn(kakaoUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.KAKAO, "kakao-id-456"))
                .willReturn(Optional.of(identity));
            given(userRepository.findById(3L)).willReturn(Optional.of(existingUser));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            SocialLoginResponse response = authService.kakaoLogin(request);

            assertThat(response).isNotNull();
            verify(authIdentityRepository, Mockito.never()).save(any(AuthIdentity.class));
            verify(voyageStatusRepository, Mockito.never()).save(any());
        }

        @Test
        @DisplayName("카카오로그인_정지된_유저_예외")
        void 카카오로그인_정지된_유저_예외() {
            KakaoLoginRequest request = new KakaoLoginRequest("auth-code");
            User suspended = 정지된유저(3L);
            AuthIdentity identity = 인증수단(suspended, AuthType.KAKAO, "kakao-id-456", null);

            given(kakaoClient.getAccessToken("auth-code")).willReturn("kakao-access-token");
            given(kakaoClient.getUserInfo("kakao-access-token")).willReturn(kakaoUserInfo);
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.KAKAO, "kakao-id-456"))
                .willReturn(Optional.of(identity));
            given(userRepository.findById(3L)).willReturn(Optional.of(suspended));

            assertThatThrownBy(() -> authService.kakaoLogin(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }

    // ================================================================
    // 로그인 (로컬 — AuthIdentity 기반)
    // ================================================================
    @Nested
    @DisplayName("로그인")
    class 로그인 {

        @Test
        @DisplayName("로그인_정상_성공")
        void 로그인_정상_성공() {
            LoginRequest request = new LoginRequest("test@test.com", "password1!");
            User user = 유저(1L, "테스터");
            AuthIdentity identity = 인증수단(user, AuthType.LOCAL, "test@test.com", "test@test.com");

            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "test@test.com"))
                .willReturn(Optional.of(identity));
            given(passwordEncoder.matches("password1!", "encoded")).willReturn(true);
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(anyLong())).willReturn(Optional.empty());

            LoginResponse response = authService.login(request);

            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("access-token");
        }

        @Test
        @DisplayName("로그인_존재하지않는_이메일_예외")
        void 로그인_존재하지않는_이메일_예외() {
            LoginRequest request = new LoginRequest("none@test.com", "password1!");
            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "none@test.com"))
                .willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND));
        }

        @Test
        @DisplayName("로그인_비밀번호_틀림_예외")
        void 로그인_비밀번호_틀림_예외() {
            LoginRequest request = new LoginRequest("test@test.com", "wrong!");
            User user = 유저(1L, "테스터");
            AuthIdentity identity = 인증수단(user, AuthType.LOCAL, "test@test.com", "test@test.com");

            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "test@test.com"))
                .willReturn(Optional.of(identity));
            given(passwordEncoder.matches("wrong!", "encoded")).willReturn(false);

            assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_PASSWORD));
        }

        @Test
        @DisplayName("로그인_정지된_유저_예외")
        void 로그인_정지된_유저_예외() {
            LoginRequest request = new LoginRequest("test@test.com", "password1!");
            User suspended = 정지된유저(1L);
            AuthIdentity identity = 인증수단(suspended, AuthType.LOCAL, "test@test.com", "test@test.com");

            given(authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, "test@test.com"))
                .willReturn(Optional.of(identity));
            given(passwordEncoder.matches("password1!", "encoded")).willReturn(true);
            given(userRepository.findById(1L)).willReturn(Optional.of(suspended));

            assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }

    // ================================================================
    // 로그아웃
    // ================================================================
    @Nested
    @DisplayName("로그아웃")
    class 로그아웃 {

        @Test
        @DisplayName("로그아웃_정상_성공")
        void 로그아웃_정상_성공() {
            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));

            authService.logout(new LogoutRequest("valid-token"));

            verify(refreshTokenRepository).deleteByToken("valid-token");
        }

        @Test
        @DisplayName("로그아웃_유효하지않은_토큰_예외")
        void 로그아웃_유효하지않은_토큰_예외() {
            given(refreshTokenRepository.findByToken("invalid")).willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.logout(new LogoutRequest("invalid")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_REFRESH_TOKEN));
        }
    }

    // ================================================================
    // 토큰 재발급
    // ================================================================
    @Nested
    @DisplayName("토큰재발급")
    class 토큰재발급 {

        @Test
        @DisplayName("토큰재발급_정상_성공")
        void 토큰재발급_정상_성공() {
            User user = 유저(1L, "테스터");
            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("new-access");
            given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn("new-refresh");
            given(refreshTokenRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(유효한토큰()));

            TokenRefreshResponse response = authService.reissue(new TokenRefreshRequest("valid-token"));

            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("new-access");
        }

        @Test
        @DisplayName("토큰재발급_만료된_리프레시토큰_예외")
        void 토큰재발급_만료된_리프레시토큰_예외() {
            given(refreshTokenRepository.findByToken("expired-token"))
                .willReturn(Optional.of(만료된토큰()));

            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("expired-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.EXPIRED_REFRESH_TOKEN));
        }

        @Test
        @DisplayName("토큰재발급_존재하지않는_토큰_예외")
        void 토큰재발급_존재하지않는_토큰_예외() {
            given(refreshTokenRepository.findByToken("ghost-token")).willReturn(Optional.empty());

            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("ghost-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_REFRESH_TOKEN));
        }

        @Test
        @DisplayName("토큰재발급_정지된_유저_예외")
        void 토큰재발급_정지된_유저_예외() {
            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));
            given(userRepository.findById(1L)).willReturn(Optional.of(정지된유저(1L)));

            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("valid-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }
}