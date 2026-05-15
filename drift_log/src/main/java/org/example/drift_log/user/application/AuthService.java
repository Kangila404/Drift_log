package org.example.drift_log.user.application;

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

public interface AuthService {

    // 회원가입
    public SignUpResponse signup(SignUpRequest request);

    // 로그인
    public LoginResponse login(LoginRequest request);

    // 소셜 로그인
    public SocialLoginResponse socialLogin(SocialLoginRequest request);

    // 로그아웃
    public LogoutResponse logout(LogoutRequest request);

    // 리프레시 토큰으로 Access 토큰 재발급
    public TokenRefreshResponse reissue(TokenRefreshRequest request);
}
