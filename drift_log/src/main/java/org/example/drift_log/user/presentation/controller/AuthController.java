package org.example.drift_log.user.presentation.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.application.AuthService;
import org.example.drift_log.user.presentation.dto.req.SignUpRequest;
import org.example.drift_log.user.presentation.dto.res.SignUpResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

}
