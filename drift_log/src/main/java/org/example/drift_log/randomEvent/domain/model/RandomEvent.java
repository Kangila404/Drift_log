package org.example.drift_log.randomEvent.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;


@Entity
@Table(name = "random_event")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RandomEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column
    private String triggerWeather;

    @Column(nullable = false)
    private Integer cooldownMinutes;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;

    @Column
    private String imageUrl;

    @Builder
    public RandomEvent(Long id, String name, String text, Integer cooldownMinutes) {
        this.id = id;
        this.name = name;
        this.text = text;
        this.cooldownMinutes = cooldownMinutes;
    }

}
