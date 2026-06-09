package org.example.drift_log.user.application;

import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.city.exception.CityErrorCode;
import org.example.drift_log.city.exception.CityException;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.example.drift_log.trace.exception.TraceErrorCode;
import org.example.drift_log.trace.exception.TraceException;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.enums.UserStatus;
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
import org.example.drift_log.user.presentation.dto.res.LogoutResponse;
import org.example.drift_log.user.presentation.dto.res.SignUpResponse;
import org.example.drift_log.user.presentation.dto.res.SocialLoginResponse;
import org.example.drift_log.user.presentation.dto.res.TokenRefreshResponse;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final KakaoClient kakaoClient;

    private final VoyageStatusRepository voyageStatusRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final DiscoveredTraceRepository discoveredTraceRepository;
    private final TraceRepository traceRepository;
    private final CityRepository cityRepository;
    private final AuthIdentityRepository authIdentityRepository;

    @Override
    public SignUpResponse signup(SignUpRequest request) {
        // 입력 정합성 검증
        validateEmailNotDuplicated(request.email());
        validatePasswordConfirm(request.password(), request.passwordConfirm());

        String encodedPassword = passwordEncoder.encode(request.password());

        // 1) 사람 정보(User) 생성
        User user = User.createLocalUser(request.name());
        userRepository.save(user);

        // 2) 로컬 인증수단(AuthIdentity) 생성 — providerId = email
        authIdentityRepository.save(
            AuthIdentity.ofLocal(user, request.email(), encodedPassword)
        );

        // 3) 초기 항해 상태
        voyageStatusRepository.save(VoyageStatus.builder()
            .userId(user.getId())
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(1L)
            .progress(0.0f)
            .isFamilyReunited(false)
            .build());

        // 4) 서울 흔적
        registerSeoulTrace(user.getId());

        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        return SignUpResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        // 1) 로컬 인증수단 조회 (providerId = email)
        AuthIdentity identity = authIdentityRepository
            .findByProviderAndProviderId(AuthType.LOCAL, request.email())
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));

        // 2) 비밀번호 검증
        validatePassword(request.password(), identity.getPassword());

        // 3) 사람(User) 조회 + 상태 검증
        User user = findUserByIdOrThrow(identity.getUser().getId());
        validateUserStatus(user.getUserStatus());

        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        user.updateLastLoginAt();
        userRepository.save(user);

        return LoginResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public SocialLoginResponse socialLogin(SocialLoginRequest request) {
        GoogleTokenVerifier.GoogleUserInfo googleUser = googleTokenVerifier.verify(request.idToken());

        AuthType provider = AuthType.GOOGLE;
        String providerId = googleUser.sub();

        AuthIdentity identity = authIdentityRepository
            .findByProviderAndProviderId(provider, providerId)
            .orElse(null);

        User user;
        if (identity != null) {
            user = findUserByIdOrThrow(identity.getUser().getId());
        } else {
            // sub로 못 찾음 → 백필된 임시 email 행 교정 시도
            AuthIdentity legacy = (googleUser.email() != null)
                ? authIdentityRepository.findByProviderAndProviderId(provider, googleUser.email()).orElse(null)
                : null;

            if (legacy != null) {
                legacy.updateProviderId(providerId);
                authIdentityRepository.save(legacy);
                user = findUserByIdOrThrow(legacy.getUser().getId());
            } else {
                user = registerSocialUser(provider, providerId, googleUser.email(), googleUser.name());
            }
        }

        validateUserStatus(user.getUserStatus());

        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        user.updateLastLoginAt();
        userRepository.save(user);

        return SocialLoginResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public SocialLoginResponse kakaoLogin(KakaoLoginRequest request) {
        String kakaoAccessToken = kakaoClient.getAccessToken(request.code());
        KakaoClient.KakaoUserInfo kakaoUser = kakaoClient.getUserInfo(kakaoAccessToken);

        AuthType provider = AuthType.KAKAO;
        String providerId = kakaoUser.kakaoId();

        AuthIdentity identity = authIdentityRepository
            .findByProviderAndProviderId(provider, providerId)
            .orElse(null);

        User user;
        if (identity != null) {
            user = findUserByIdOrThrow(identity.getUser().getId());
        } else {
            user = registerSocialUser(provider, providerId, kakaoUser.email(), kakaoUser.nickname());
        }

        validateUserStatus(user.getUserStatus());

        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        user.updateLastLoginAt();
        userRepository.save(user);

        return SocialLoginResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public LogoutResponse logout(LogoutRequest request) {
        findRefreshTokenOrThrow(request.refreshToken());
        refreshTokenRepository.deleteByToken(request.refreshToken());
        return new LogoutResponse(true);
    }

    @Override
    public TokenRefreshResponse reissue(TokenRefreshRequest request) {
        RefreshToken refreshToken = findRefreshTokenOrThrow(request.refreshToken());
        validateRefreshTokenExpired(refreshToken);

        User user = findUserByIdOrThrow(refreshToken.getUserId());
        validateUserStatus(user.getUserStatus());

        String issuedRefreshToken = saveRefreshToken(user.getId());
        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());

        return TokenRefreshResponse.from(issuedRefreshToken, accessToken);
    }

    // ============ 회원가입 정합성 검증 ============ //
    // 이메일 중복 체크 — auth_identities(LOCAL, email) 기준
    private void validateEmailNotDuplicated(String email){
        if (authIdentityRepository.findByProviderAndProviderId(AuthType.LOCAL, email).isPresent()) {
            throw new UserException(UserErrorCode.EMAIL_ALREADY_EXISTS);
        }
    }

    private void validatePasswordConfirm(String password, String passwordConfirm){
        if (!password.equals(passwordConfirm)) {
            throw new UserException(UserErrorCode.PASSWORD_NOT_MATCHED);
        }
    }

    // ============ Jwt 관련 ============ //
    private String saveRefreshToken(Long userId){
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);
        RefreshToken savedToken = refreshTokenRepository.findByUserId(userId).orElse(null);

        if (savedToken == null) {
            refreshTokenRepository.save(
                RefreshToken.builder()
                    .userId(userId)
                    .token(refreshToken)
                    .expirationAt(LocalDateTime.now().plusDays(7))
                    .build()
            );
        } else {
            savedToken.updateToken(refreshToken, LocalDateTime.now().plusDays(7));
        }
        return refreshToken;
    }

    private RefreshToken findRefreshTokenOrThrow(String refreshToken){
        return refreshTokenRepository.findByToken(refreshToken)
            .orElseThrow(() -> new UserException(UserErrorCode.INVALID_REFRESH_TOKEN));
    }

    private void validateRefreshTokenExpired(RefreshToken refreshToken){
        if (refreshToken.isExpired()) {
            throw new UserException(UserErrorCode.EXPIRED_REFRESH_TOKEN);
        }
    }

    // ============ 공통 ============ //
    User findUserByIdOrThrow(Long id){
        return userRepository.findById(id)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND_BY_ID));
    }

    private void validateUserStatus(UserStatus userStatus){
        if (userStatus.equals(UserStatus.SUSPENDED)) {
            throw new UserException(UserErrorCode.USER_SUSPENDED);
        }
    }

    private void validatePassword(String rawPassword, String encodedPassword){
        if (!passwordEncoder.matches(rawPassword, encodedPassword)) {
            throw new UserException(UserErrorCode.INVALID_PASSWORD);
        }
    }

    // 서울 흔적 자동 발견
    private void registerSeoulTrace(Long userId) {
        Trace trace = traceRepository.findById(5L)
            .orElseThrow(() -> new TraceException(TraceErrorCode.TRACE_NOT_FOUND));
        City city = cityRepository.findById(1L)
            .orElseThrow(() -> new CityException(CityErrorCode.CITY_NOT_FOUND));

        discoveredTraceRepository.save(
            DiscoveredTrace.builder()
                .userId(userId)
                .trace(trace)
                .city(city)
                .discoveredAt(LocalDateTime.now())
                .build()
        );
    }

    // 소셜 유저 생성 — User(사람) + AuthIdentity(인증수단)
    private User registerSocialUser(AuthType provider, String providerId, String email, String name) {
        User user = User.createLocalUser(name);
        userRepository.save(user);

        authIdentityRepository.save(
            AuthIdentity.ofSocial(user, provider, providerId, email)
        );

        voyageStatusRepository.save(VoyageStatus.builder()
            .userId(user.getId())
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(1L)
            .progress(0.0f)
            .isFamilyReunited(false)
            .build());

        registerSeoulTrace(user.getId());
        return user;
    }
}