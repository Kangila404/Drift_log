package org.example.drift_log.common.config;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.infrastructure.jwt.JwtFilter;
import org.example.drift_log.user.infrastructure.jwt.JwtTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()  // 로그인, 회원가입은 토큰 없이 허용
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll() // 스웨거 통과
                .anyRequest().authenticated()                  // 나머지는 토큰 필요
            )
            .addFilterBefore(new JwtFilter(jwtTokenProvider),  // JwtFilter 등록
                UsernamePasswordAuthenticationFilter.class)
            .build();
    }


    }
