package org.example.drift_log.user.application;

import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.enums.UserStatus;
import org.example.drift_log.user.domain.model.RefreshToken;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.RefreshTokenRepository;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.infrastructure.jwt.JwtTokenProvider;
import org.example.drift_log.user.infrastructure.oauth.GoogleTokenVerifier;
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
public class AuthServiceImpl implements AuthService{

    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final GoogleTokenVerifier googleTokenVerifier;

    private final VoyageStatusRepository voyageStatusRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    public SignUpResponse signup(SignUpRequest request) {
        // 입력 데이터 정합성 검증
        validateEmailNotDuplicated(request.email());
        validatePasswordConfirm(request.password(), request.passwordConfirm());

        // 비밀번호 인코딩
        String encodedPassword = passwordEncoder.encode(request.password());

        User user = User.createLocalUser(request.email(), encodedPassword, request.name());

        // 회원가입 완료
        userRepository.save(user);

        // 초기 VoyageStatus 생성(서울 시작)
        VoyageStatus voyageStatus = VoyageStatus.builder()
            .userId(user.getId())
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(1L)  // 서울 시작
            .progress(0.0f)
            .isFamilyReunited(false)
            .build();
        voyageStatusRepository.save(voyageStatus);

        // Jwt 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        return SignUpResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = findUserOrThrowByEmail(request.email());
        validateUserStatus(user.getUserStatus());

        validateLocalUser(user);
        validatePassword(request.password(), user.getPassword());

        // Jwt 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());
        String refreshToken = saveRefreshToken(user.getId());

        user.updateLastLoginAt();

        userRepository.save(user);

        return LoginResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public SocialLoginResponse socialLogin(SocialLoginRequest request) {
        // 1. 구글 idToken 검증
        GoogleTokenVerifier.GoogleUserInfo googleUser =googleTokenVerifier.verify(request.idToken());

        // 2. 기존 유저 조회
        User user = userRepository.findByEmail(googleUser.email())
            .orElseGet(()->{
                User newUser = User.createSocialUser(googleUser.email(), googleUser.name(), request.authType());
                userRepository.save(newUser);

                voyageStatusRepository.save(VoyageStatus.builder()
                    .userId(newUser.getId())     // save 후 id 채워짐
                    .voyageState(VoyageState.ANCHORED)
                    .currentCityId(1L)
                    .progress(0.0f)
                    .isFamilyReunited(false)
                    .build());

                return newUser;
            });


        // 3. 상태 검증
        validateUserStatus(user.getUserStatus());

        // 4. 소셜 유저 검증
        validateSocialUser(user);

        // 4. jwt 발급
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
        // 리프레시 토큰을 받음 -> 어세스 발급 ,리프레시 토큰 업데이트
        RefreshToken refreshToken = findRefreshTokenOrThrow(request.refreshToken());
        validateRefreshTokenExpired(refreshToken);

        User user = findUserByIdOrThrow(refreshToken.getUserId());

        validateUserStatus(user.getUserStatus());

        String issuedRefreshToken = saveRefreshToken(user.getId());
        String accessToken = jwtTokenProvider.createAccessToken(user.getUserId(), user.getUserRole().name());

        return TokenRefreshResponse.from(issuedRefreshToken, accessToken);
    }


    // ============ 회원가입 정합성 검증  ============ //
    // 1. 이메일 중복 체크
    private void validateEmailNotDuplicated(String email){
        if(userRepository.existsByEmail(email)){
            throw new UserException(UserErrorCode.EMAIL_ALREADY_EXISTS);

        }
    }

    // 2. 비밀번호 = 비밀번호 확인 검증
    private void validatePasswordConfirm(String password, String passwordConfirm){
        if(!password.equals(passwordConfirm)){
            throw new UserException(UserErrorCode.PASSWORD_NOT_MATCHED);
        }
    }

    // ============ Jwt 관련 함수 ============ //
    // 1. Jwt RefreshToken 생성 및 저장
    private String saveRefreshToken(Long userId){
        // 1) 리프레시 토큰 생성
        String refreshToken = jwtTokenProvider.createRefreshToken(userId);
        // 2) 현재 리프레시 토큰이 있는지 조회
        RefreshToken savedToken = refreshTokenRepository.findByUserId(userId)
            .orElse(null);

        // 3-1) 리프레시 토큰이 없다면
        if(savedToken == null){
            refreshTokenRepository.save(
                RefreshToken.builder()
                    .userId(userId)
                    .token(refreshToken)
                    .expirationAt(LocalDateTime.now().plusDays(7))
                    .build()
            );
        }
        // 3-2) 있다면
        else {
            savedToken.updateToken(refreshToken, LocalDateTime.now().plusDays(7));
        }

        return refreshToken;
    }

    // 2. 리프레시 토큰 찾거나 없으면 버리기
    private RefreshToken findRefreshTokenOrThrow(String refreshToken){
        return refreshTokenRepository.findByToken(refreshToken)
            .orElseThrow(()-> new UserException(UserErrorCode.INVALID_REFRESH_TOKEN));
    }

    // 3. 리프레시 토큰 만료 여부 확인
    private void validateRefreshTokenExpired(RefreshToken refreshToken){
        if(refreshToken.isExpired()){
            throw new UserException(UserErrorCode.EXPIRED_REFRESH_TOKEN);
        }
    }

    // ============ 로그인 관련 함수 ============ //
    // 1. 이메일 -> 유저 조회
    private User findUserOrThrowByEmail(String email){
        return userRepository.findByEmail(email)
            .orElseThrow(()->new UserException(UserErrorCode.USER_NOT_FOUND));
    }

    // 2. 리프레시 토큰에 담긴 userId(long) -> User 찾기
    User findUserByIdOrThrow(Long id){
        return userRepository.findById(id)
            .orElseThrow(()->new UserException((UserErrorCode.USER_NOT_FOUND_BY_ID)));
    }


    // 3. 유저 상태 확인
    private void validateUserStatus(UserStatus userStatus){
        if(userStatus.equals(UserStatus.SUSPENDED)){
            throw new UserException(UserErrorCode.USER_SUSPENDED);
        }
    }

    // 4. 유저 정보 = 패스워드 맞는지 확인
    private void validatePassword(String rawPassword, String encodedPassword){
        if(!passwordEncoder.matches(rawPassword, encodedPassword)){
            throw new UserException(UserErrorCode.INVALID_PASSWORD);
        }
    }

    // 5. 소셜(구글) 유저 검증
    private void validateSocialUser(User user){

        if(!user.getAuthType().equals(AuthType.GOOGLE)){
            throw new UserException(UserErrorCode.INVALID_AUTHTYPE);
        }
    }

    // 6. 로컬 유저 검증
    private void validateLocalUser(User user){
        if(!user.getAuthType().equals(AuthType.LOCAL)){
            throw new UserException(UserErrorCode.INVALID_AUTHTYPE);
        }
    }
}
