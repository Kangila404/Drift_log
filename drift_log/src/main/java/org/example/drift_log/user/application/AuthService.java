package org.example.drift_log.user.application;

import org.example.drift_log.user.presentation.dto.req.KakaoLoginRequest;
import org.example.drift_log.user.presentation.dto.req.KakaoNativeLoginRequest;
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
    SignUpResponse signup(SignUpRequest request);

    // 로그인
    LoginResponse login(LoginRequest request);

    // 구글 로그인
    SocialLoginResponse socialLogin(SocialLoginRequest request);

    // 카카오 로그인
    SocialLoginResponse kakaoLogin(KakaoLoginRequest request);

    // 카카오 앱 로그인
    SocialLoginResponse kakaoNativeLogin(KakaoNativeLoginRequest request);

    // 로그아웃
    LogoutResponse logout(LogoutRequest request);

    // 리프레시 토큰으로 Access 토큰 재발급
    TokenRefreshResponse reissue(TokenRefreshRequest request);
}
