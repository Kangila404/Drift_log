package org.example.drift_log.voyage.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Entity
@Table(name = "voyage_log")
@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class VoyageLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(nullable = false)
    Long userId;

    @Column(nullable = false)
    Long fromCityId;

    @Column(nullable = false)
    Long toCityId;

    @Column(columnDefinition = "TEXT")
    String autoText;

    String userText;

    String weatherTheme;

}
