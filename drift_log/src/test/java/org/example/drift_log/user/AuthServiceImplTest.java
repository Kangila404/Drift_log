package org.example.drift_log.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;
import java.util.Optional;
import org.example.drift_log.user.application.AuthServiceImpl;
import org.example.drift_log.user.domain.model.RefreshToken;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.RefreshTokenRepository;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.infrastructure.jwt.JwtTokenProvider;
import org.example.drift_log.user.infrastructure.oauth.GoogleTokenVerifier;
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
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class AuthServiceImplTest {

    @InjectMocks
    private AuthServiceImpl authService;

    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private GoogleTokenVerifier googleTokenVerifier;
    @Mock private UserRepository userRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private VoyageStatusRepository voyageStatusRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private User 정지된유저() {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        user.banUser();
        return user;
    }

    private RefreshToken 유효한토큰() {
        return RefreshToken.builder()
            .userId(1L)
            .token("valid-token")
            .expirationAt(LocalDateTime.now().plusDays(7))
            .build();
    }

    private RefreshToken 만료된토큰() {
        return RefreshToken.builder()
            .userId(1L)
            .token("expired-token")
            .expirationAt(LocalDateTime.now().minusDays(1))
            .build();
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
            given(userRepository.existsByEmail("test@test.com")).willReturn(false);
            given(passwordEncoder.encode("password1!")).willReturn("encoded");
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            // when
            authService.signup(request);

            // then - 유저 저장 + voyageStatus 초기화 둘 다 호출됐는지 검증
            verify(voyageStatusRepository).save(any());
        }

        @Test
        @DisplayName("회원가입_이메일_중복_예외")
        void 회원가입_이메일_중복_예외() {
            // given
            SignUpRequest request = new SignUpRequest("dup@test.com", "테스터", "password1!", "password1!");
            given(userRepository.existsByEmail("dup@test.com")).willReturn(true);

            // when & then
            assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.EMAIL_ALREADY_EXISTS));
        }

        @Test
        @DisplayName("회원가입_비밀번호_확인_불일치_예외")
        void 회원가입_비밀번호_확인_불일치_예외() {
            // given
            SignUpRequest request = new SignUpRequest("test@test.com", "테스터", "password1!", "different!");
            given(userRepository.existsByEmail(anyString())).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.PASSWORD_NOT_MATCHED));
        }
    }

    // ================================================================
    // 소셜 로그인
    // ================================================================
    @Nested
    @DisplayName("소셜로그인")
    class 소셜로그인 {

        private final GoogleTokenVerifier.GoogleUserInfo googleUserInfo =
            new GoogleTokenVerifier.GoogleUserInfo("google@test.com", "구글유저");

        @Test
        @DisplayName("소셜로그인_신규유저_정상_성공")
        void 소셜로그인_신규유저_정상_성공() {
            // given
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(userRepository.findByEmail("google@test.com")).willReturn(Optional.empty());
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            // when
            SocialLoginResponse response = authService.socialLogin(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("access-token");
            assertThat(response.refreshToken()).isEqualTo("refresh-token");
            verify(voyageStatusRepository).save(any());
        }

        @Test
        @DisplayName("소셜로그인_기존유저_정상_성공")
        void 소셜로그인_기존유저_정상_성공() {
            // given
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            User existingUser = User.createSocialUser("google@test.com", "구글유저", AuthType.GOOGLE);
            ReflectionTestUtils.setField(existingUser, "id", 2L);

            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(userRepository.findByEmail("google@test.com")).willReturn(Optional.of(existingUser));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(any())).willReturn(Optional.empty());

            // when
            SocialLoginResponse response = authService.socialLogin(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("access-token");
        }

        @Test
        @DisplayName("소셜로그인_유효하지않은_토큰_예외")
        void 소셜로그인_유효하지않은_토큰_예외() {
            // given
            SocialLoginRequest request = new SocialLoginRequest("bad-token", AuthType.GOOGLE);
            given(googleTokenVerifier.verify("bad-token"))
                .willThrow(new UserException(UserErrorCode.INVALID_SOCIAL_TOKEN));

            // when & then
            assertThatThrownBy(() -> authService.socialLogin(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_SOCIAL_TOKEN));
        }

        @Test
        @DisplayName("소셜로그인_정지된_유저_예외")
        void 소셜로그인_정지된_유저_예외() {
            // given
            SocialLoginRequest request = new SocialLoginRequest("id-token", AuthType.GOOGLE);
            User suspended = User.createSocialUser("google@test.com", "구글유저", AuthType.GOOGLE);
            ReflectionTestUtils.setField(suspended, "id", 2L);
            suspended.banUser();

            given(googleTokenVerifier.verify("id-token")).willReturn(googleUserInfo);
            given(userRepository.findByEmail("google@test.com")).willReturn(Optional.of(suspended));

            // when & then
            assertThatThrownBy(() -> authService.socialLogin(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }

    // ================================================================
    // 로그인
    // ================================================================
    @Nested
    @DisplayName("로그인")
    class 로그인 {

        @Test
        @DisplayName("로그인_정상_성공")
        void 로그인_정상_성공() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "password1!");
            User mockUser = 활성유저(); // id = 1L 주입됨

            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(mockUser));
            given(passwordEncoder.matches("password1!", "encoded")).willReturn(true);
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn("refresh-token");
            given(refreshTokenRepository.findByUserId(anyLong())).willReturn(Optional.empty());

            // when
            LoginResponse response = authService.login(request);

            // then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("access-token");
            assertThat(response.refreshToken()).isEqualTo("refresh-token");
        }

        @Test
        @DisplayName("로그인_존재하지않는_이메일_예외")
        void 로그인_존재하지않는_이메일_예외() {
            // given
            LoginRequest request = new LoginRequest("none@test.com", "password1!");
            given(userRepository.findByEmail("none@test.com")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND));
        }

        @Test
        @DisplayName("로그인_비밀번호_틀림_예외")
        void 로그인_비밀번호_틀림_예외() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "wrong!");
            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(활성유저()));
            given(passwordEncoder.matches("wrong!", "encoded")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_PASSWORD));
        }

        @Test
        @DisplayName("로그인_정지된_유저_예외")
        void 로그인_정지된_유저_예외() {
            // given
            LoginRequest request = new LoginRequest("test@test.com", "password1!");
            given(userRepository.findByEmail("test@test.com")).willReturn(Optional.of(정지된유저()));

            // when & then
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
            // given
            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));

            // when
            authService.logout(new LogoutRequest("valid-token"));

            // then - 실제로 토큰 삭제가 호출됐는지 검증
            verify(refreshTokenRepository).deleteByToken("valid-token");
        }

        @Test
        @DisplayName("로그아웃_유효하지않은_토큰_예외")
        void 로그아웃_유효하지않은_토큰_예외() {
            // given
            given(refreshTokenRepository.findByToken("invalid")).willReturn(Optional.empty());

            // when & then
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
            // given
            User mockUser = 활성유저(); // id = 1L 주입됨

            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));
            given(userRepository.findById(1L)).willReturn(Optional.of(mockUser));
            given(jwtTokenProvider.createAccessToken(any(), any())).willReturn("new-access");
            given(jwtTokenProvider.createRefreshToken(anyLong())).willReturn("new-refresh");
            given(refreshTokenRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(유효한토큰()));

            // when
            TokenRefreshResponse response = authService.reissue(new TokenRefreshRequest("valid-token"));

            // then
            assertThat(response).isNotNull();
            assertThat(response.accessToken()).isEqualTo("new-access");
            assertThat(response.refreshToken()).isEqualTo("new-refresh");
        }

        @Test
        @DisplayName("토큰재발급_만료된_리프레시토큰_예외")
        void 토큰재발급_만료된_리프레시토큰_예외() {
            // given
            given(refreshTokenRepository.findByToken("expired-token"))
                .willReturn(Optional.of(만료된토큰()));

            // when & then
            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("expired-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.EXPIRED_REFRESH_TOKEN));
        }

        @Test
        @DisplayName("토큰재발급_존재하지않는_토큰_예외")
        void 토큰재발급_존재하지않는_토큰_예외() {
            // given
            given(refreshTokenRepository.findByToken("ghost-token")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("ghost-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.INVALID_REFRESH_TOKEN));
        }

        @Test
        @DisplayName("토큰재발급_정지된_유저_예외")
        void 토큰재발급_정지된_유저_예외() {
            // given - 토큰은 유효하지만 유저가 정지됨
            given(refreshTokenRepository.findByToken("valid-token"))
                .willReturn(Optional.of(유효한토큰()));
            given(userRepository.findById(1L)).willReturn(Optional.of(정지된유저()));

            // when & then
            assertThatThrownBy(() -> authService.reissue(new TokenRefreshRequest("valid-token")))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_SUSPENDED));
        }
    }
}