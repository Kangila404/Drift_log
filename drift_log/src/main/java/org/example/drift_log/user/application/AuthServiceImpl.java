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
import org.example.drift_log.user.infrastructure.jwt.JwtTokenProvider;
import org.example.drift_log.user.presentation.dto.req.LoginRequest;
import org.example.drift_log.user.presentation.dto.req.LogoutRequest;
import org.example.drift_log.user.presentation.dto.req.SignUpRequest;
import org.example.drift_log.user.presentation.dto.req.SocialLoginRequest;
import org.example.drift_log.user.presentation.dto.res.LoginResponse;
import org.example.drift_log.user.presentation.dto.res.LogoutResponse;
import org.example.drift_log.user.presentation.dto.res.SignUpResponse;
import org.example.drift_log.user.presentation.dto.res.SocialLoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

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

        // Jwt 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = saveRefreshToken(user.getId());

        return SignUpResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        User user = findUserOrThrowByEmail(request.email());
        validateUserStatus(user.getUserStatus());

        // 로컬 회원만 비밀번호 검사
        if(user.getAuthType().equals(AuthType.LOCAL)){
            validatePassword(request.password(), user.getPassword());
        }

        // Jwt 토큰 발급
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = saveRefreshToken(user.getId());

        return LoginResponse.from(user, accessToken, refreshToken);
    }

    @Override
    public SocialLoginResponse socialLogin(SocialLoginRequest request) {
        return null;
    }

    @Override
    public LogoutResponse logout(LogoutRequest request) {

        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
            .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 리프레시 토큰입니다."));

            refreshTokenRepository.deleteByToken(request.refreshToken());

        return new LogoutResponse(true);
    }


    // ============ 회원가입 정합성 검증 ============ //
    // 1. 이메일 중복 체크
    private void validateEmailNotDuplicated(String email){
        if(userRepository.existsByEmail(email)){
            throw new IllegalArgumentException("이메일이 이미 존재합니다.");
        }
    }

    // 2. 비밀번호 = 비밀번호 확인 검증
    private void validatePasswordConfirm(String password, String passwordConfirm){
        if(!password.equals(passwordConfirm)){
            throw new IllegalArgumentException("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
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

    // ============ 로그인 관련 함수 ============ //
    // 1. 이메일 -> 유저 조회
    private User findUserOrThrowByEmail(String email){
        return userRepository.findByEmail(email)
            .orElseThrow(()->new IllegalArgumentException("로그인 실패입니다."));
    }


    // 2. 유저 상태 확인
    private void validateUserStatus(UserStatus userStatus){
        if(userStatus.equals(UserStatus.SUSPENDED)){
            throw new IllegalArgumentException(("정지된 유저입니다."));
        }
    }

    // 2. 유저 정보 = 패스워드 맞는지 확인
    private void validatePassword(String rawPassword, String encodedPassword){
        if(!passwordEncoder.matches(rawPassword, encodedPassword)){
            throw new IllegalArgumentException("비밀번호가 틀립니다");
        }
    }
}
