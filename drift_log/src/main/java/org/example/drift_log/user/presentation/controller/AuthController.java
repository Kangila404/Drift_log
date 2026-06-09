package org.example.drift_log.user.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.application.AuthService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "유저의 회원가입, 로그인, 로그아웃, 토큰 재발급 관련 컨트롤러")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<SignUpResponse> signup(@Valid @RequestBody SignUpRequest request){
        SignUpResponse response = authService.signup(request);
        return ResponseEntity.ok(response);
    }

    // ================ 소셜 로그인 ================ //
    // 1. google
    @PostMapping("/google")
    public ResponseEntity<SocialLoginResponse> googleLogin(@Valid @RequestBody SocialLoginRequest request){
        SocialLoginResponse response = authService.socialLogin(request);
        return ResponseEntity.ok(response);
    }

    // 2. kakao
    @PostMapping("/kakao")
    public ResponseEntity<SocialLoginResponse> kakaoLogin(@Valid @RequestBody KakaoLoginRequest request){
        SocialLoginResponse response = authService.kakaoLogin(request);
        return ResponseEntity.ok(response);
    }

    // 로그인
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request){
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<LogoutResponse> logout(@Valid @RequestBody LogoutRequest request){
        LogoutResponse response = authService.logout(request);
        return ResponseEntity.ok(response);
    }

    // 토큰 재발급
    @PostMapping("/reissue")
    public ResponseEntity<TokenRefreshResponse> reissue(@Valid @RequestBody TokenRefreshRequest request){
        TokenRefreshResponse response = authService.reissue(request);
        return ResponseEntity.ok(response);
    }




}
