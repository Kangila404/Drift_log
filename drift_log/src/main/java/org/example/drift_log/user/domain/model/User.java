package org.example.drift_log.user.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.enums.UserRole;
import org.example.drift_log.user.domain.enums.UserStatus;

@Builder
@Getter
@Entity
@Table(name = "users")
@RequiredArgsConstructor
@AllArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", unique = true)
    private String userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false)
    private UserRole userRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_status", nullable = false)
    private UserStatus userStatus;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    // 비즈니스 로직

    // 1. 회원가입
    public static User createLocalUser(String name){
        return User.builder()
            .userId(UUID.randomUUID().toString())
            .name(name)
            .userRole(UserRole.USER)
            .userStatus(UserStatus.ACTIVE)
            .lastLoginAt(LocalDateTime.now())
            .build();
    }

    // 3. 마지막 로그인 업데이트
    public void updateLastLoginAt(){
        this.lastLoginAt = LocalDateTime.now();
    }

    // 4. 유저 밴
    public void banUser(){
        this.userStatus = UserStatus.SUSPENDED;
    }

    // 5. 유저 활성화
    public void activateUser(){
        this.userStatus = UserStatus.ACTIVE;
    }

    // 6. 닉네임 변경
    public void updateName(String name){
        this.name = name;
    }


}
