package org.example.drift_log.voyage.domain.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.randomEvent.domain.model.VoyageEvent;

@Entity
@Table(name = "voyage_log")
@Builder
@Getter
@AllArgsConstructor
@NoArgsConstructor
public class VoyageLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_city_id", nullable = false)
    private City fromCity;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_city_id", nullable = false)
    private City toCity;

    @Column(columnDefinition = "TEXT")
    private String autoText;

    @Column(columnDefinition = "TEXT")
    private String userText;

    String weatherTheme;

    @Builder.Default
    @OneToMany(mappedBy = "voyageLog", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<VoyageEvent> voyageEvents = new ArrayList<>();


    // ========== 비즈니스 로직 ========== //
    // 1. 항해 기록 작성
    public void writeVoyageLog(String text){
        this.userText = text;
    }

    // 2. autoText 업데이트
    public void updateAutoText(String autoText) {
        this.autoText = autoText;
    }


}
