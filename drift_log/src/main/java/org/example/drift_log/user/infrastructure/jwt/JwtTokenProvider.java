package org.example.drift_log.user.infrastructure.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public final class JwtTokenProvider {

    private final Key key;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;

    public JwtTokenProvider(
        @Value("${spring.jwt.secret}") String secret,
        @Value("${spring.jwt.access-token-expiration}") long accessTokenExpiration,
        @Value("${spring.jwt.refresh-token-expiration}") long refreshTokenExpiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
    }

    // 1. AccessToken 생성
    public String createAccessToken(Long userId){
        return Jwts.builder()
            .setSubject(String.valueOf(userId))
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }

    // 2. RefreshToken 생성
    public String createRefreshToken(Long userId){
        return Jwts.builder()
            .setSubject(String.valueOf(userId))
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
            .signWith(key, SignatureAlgorithm.HS256)
            .compact();
    }

    // 3. 토큰 -> user의 Id 추출
    public long getUserId(String token){
        return Long.parseLong(getClaims(token).getSubject());
    }

    // 4. 토큰 유효성 검증
    public boolean validateToken(String token){
        try{
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e){
            return false;
        }
    }

    // 5. 토큰 값 꺼내기
    private Claims getClaims(String token){
        return Jwts.parserBuilder()
            .setSigningKey(key)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }


}
