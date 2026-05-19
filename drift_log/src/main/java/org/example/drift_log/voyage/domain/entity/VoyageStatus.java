package org.example.drift_log.voyage.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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



    // 비즈니스 로직
    // 1. 정박 -> 항해 시작
    public void startSailing(Long destinationCityId){
        this.departedCityId = this.currentCityId;
        this.destinationCityId = destinationCityId;
        this.currentCityId = null;
        this.voyageState = voyageState.SAILING;
        this.progress = 0f;
    }

    // 2. 항해 중 -> 잠깐 멈추기(진척도 안 올리기)

    // 2. 항해 -> 정박
    public void arrive(){
        this.currentCityId = this.destinationCityId;
        this.departedCityId = null;
        this.destinationCityId = null;
        this.voyageState = voyageState.ANCHORED;
        this.progress = 0f;
    }

    // 3. 항해 진척도 갱신
    public void updateProgress(float delta) {
        this.progress = Math.min(this.progress + delta, 1.0f);
    }



}
