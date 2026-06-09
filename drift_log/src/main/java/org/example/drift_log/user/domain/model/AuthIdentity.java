package org.example.drift_log.user.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.user.domain.enums.AuthType;

@Builder
@Getter
@Entity
@Table(
    name = "auth_identities",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_auth_provider", columnNames = {"provider", "provider_id"})
    }
)
@RequiredArgsConstructor
@AllArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthIdentity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private AuthType provider;

    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "email")
    private String email;

    @Column(name = "password")
    private String password;

    // 로컬 인증 수단
    public static AuthIdentity ofLocal(User user, String email, String encodedPassword){
        return AuthIdentity.builder()
            .user(user)
            .email(email)
            .provider(AuthType.LOCAL)
            .providerId(email)
            .password(encodedPassword)
            .build();
    }

    // 소셜 인증 수단
    public static AuthIdentity ofSocial(User user, AuthType provider, String providerId, String email) {
        return AuthIdentity.builder()
            .user(user)
            .provider(provider)
            .providerId(providerId)
            .email(email)
            .password(null)
            .build();
    }

    // 기존 구글 유저 sub 교정용
    public void updateProviderId(String providerId){
        this.providerId = providerId;
    }


    // =========== 비즈니스 로직 ========= //
    // 1. 비밀번호 변경
    public void updatePassword(String encodedPassword){
        this.password = encodedPassword;
    }

}

