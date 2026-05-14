package org.example.drift_log.user.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Entity
@Table(name = "refresh_token")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
     private Long id;

    @Column(unique = true,  nullable = false)
    private Long userId;

    @Column(unique = true, nullable = false)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expirationAt;




    // ================= 비즈니스 로직 ================= //
    // 1. 재로그인 시 토큰 날짜 업데이트
    public void updateToken(String refreshToken, LocalDateTime expirationAt){
        this.token = refreshToken;
        this.expirationAt = expirationAt;
    }
}
