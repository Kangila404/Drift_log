package org.example.drift_log.city.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Entity
@Table(name = "city_route")
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CityRoute extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    @Column(name = "from_city_id", nullable = false)
    Long fromCityId;

    @Column(name = "to_city_id", nullable = false)
    Long toCityId;

    @Column(name = "duration_minutes", nullable = false)
    Integer durationMinutes;
}
