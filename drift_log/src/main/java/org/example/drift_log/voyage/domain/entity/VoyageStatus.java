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

    private Long departedCityId;

    private Long destinationCityId;

    @Column(nullable = false)
    private boolean isFamilyReunited;

}
