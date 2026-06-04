package org.example.drift_log.weather.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity
@Table(name = "weather_theme")
public class WeatherTheme extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    @Column(nullable = false)
    private String realWeather; // 기상청 날씨


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "weather_id")
    private Weather weather; // drift_log 날씨

    @Column(nullable = false)
    private boolean isAbnormal; // 보통 날씨 / 이상 날씨


    // 비즈니스 로직
    // 1. 날씨 바꾸기
    public static WeatherTheme changeWeather(String realWeather, Weather weather, boolean isAbnormal) {
        return WeatherTheme.builder()
            .date(LocalDate.now(ZoneId.of("Asia/Seoul")))
            .realWeather(realWeather)
            .weather(weather)
            .isAbnormal(isAbnormal)
            .build();
    }

}
