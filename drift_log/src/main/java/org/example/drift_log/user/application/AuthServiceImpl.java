package org.example.drift_log.user.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
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
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Override
    public SignUpResponse signup(SignUpRequest request) {
        // 입력 데이터 정합성 검증
        validateEmailNotDuplicated(request.email());
        validatePasswordConfirm(request.password(), request.passwordConfirm());

        // 비밀번호 인코딩
        String encodedPassword = passwordEncoder.encode(request.password());

        User user = User.createLocalUser(request.email(), encodedPassword, request.name());

        userRepository.save(user);
        return SignUpResponse.from(user);
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        return null;
    }

    @Override
    public SocialLoginResponse socialLogin(SocialLoginRequest request) {
        return null;
    }

    @Override
    public LogoutResponse logout(LogoutRequest request) {
        return null;
    }


    // 회원가입 정합성 검증(email 중복 체크, 비밀번호 = 비밀번호 확인 검증)
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


}
