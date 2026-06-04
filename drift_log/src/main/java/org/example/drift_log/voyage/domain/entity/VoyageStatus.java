package org.example.drift_log.voyage.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.voyage.domain.enums.VoyageState;


@Getter
@Entity
@Table(name = "voyage_status")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class VoyageStatus extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VoyageState voyageState;

    @Column(nullable = false)
    private Float progress;

    private Long currentCityId;

    private Long departedCityId;

    private Long destinationCityId;

    @Column(nullable = false)
    private boolean isFamilyReunited;

    private static final long MAX_TICK_SECONDS = 30;

    private LocalDateTime lastTickedAt;


    // 비즈니스 로직
    // 1. 정박 -> 항해 시작
    public void startSailing(Long destinationCityId){
        this.departedCityId = this.currentCityId;
        this.destinationCityId = destinationCityId;
        this.currentCityId = null;
        this.voyageState = VoyageState.SAILING;
        this.progress = 0f;
        this.lastTickedAt = LocalDateTime.now();
    }

    // 2. 항해 중 -> 잠깐 멈추기(진척도 안 올리기)
    public void pause(){
        this.voyageState = VoyageState.PAUSED;
    }
    // 3. 항해중 잠깐 멈추기 -> 다시 항해 재개
    public void resume(){
        this.voyageState = VoyageState.SAILING;
        this.lastTickedAt = LocalDateTime.now();
    }


    // 4. 항해 -> 도착
    public void arrive(){
        this.currentCityId = this.destinationCityId;
        this.voyageState = VoyageState.ANCHORED;
        this.progress = 0f;
        this.lastTickedAt = null;
    }

    // 5. 도착 -> 정박
    public void complete(){
        this.departedCityId = null;
        this.destinationCityId = null;
    }

    // 5. 항해 진척도 갱신
    public void tickProgress(long totalSeconds){
        LocalDateTime now = LocalDateTime.now();
        if(this.lastTickedAt == null){
            this.lastTickedAt = now;
            return;
        }
        long elapsed = Duration.between(this.lastTickedAt, now).getSeconds();
        this.lastTickedAt = now;

        if(elapsed <= 0) return;
        if(elapsed > MAX_TICK_SECONDS) return;

        this.progress = Math.min(1.0f, this.progress + (float) elapsed / totalSeconds);
    }



    // 6. 엔딩
    public void familyReunited(){
        this.isFamilyReunited = true;
    }

}
