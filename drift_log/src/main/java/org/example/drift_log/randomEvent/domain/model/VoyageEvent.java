package org.example.drift_log.randomEvent.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.voyage.domain.entity.VoyageLog;


@Entity
@Table(name = "voyage_event")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoyageEvent extends BaseEntity {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voyage_log_id", nullable = false)
    private VoyageLog voyageLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "random_event_id", nullable = false)
    private RandomEvent randomEvent;

    @Column(nullable = false)
    private LocalDateTime occurredAt;


}
