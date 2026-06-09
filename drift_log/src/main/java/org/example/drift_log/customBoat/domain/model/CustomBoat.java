package org.example.drift_log.customBoat.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Builder
@Getter
@Entity
@Table(name = "custom_boats")
@RequiredArgsConstructor
@AllArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomBoat extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Builder.Default
    @Column(name = "sail", nullable = false)
    private int sail = 0;

    @Builder.Default
    @Column(name = "body", nullable = false)
    private int body = 0;

    @Builder.Default
    @Column(name = "lantern", nullable = false)
    private int lantern = 0;

    // 1. 기본 보트 생성
    public static CustomBoat createDefault(Long userId){
        return CustomBoat.builder()
            .userId(userId)
            .build();
    }

    // 2. 보트 색 변경
    public void updateColors(int sail, int body, int lantern){
        this.sail = sail;
        this.body = body;
        this.lantern = lantern;
    }
}
