package org.example.drift_log.study.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.user.domain.model.User;

@Table(name = "study_time")
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StudyTime extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    private User user;

    @Column(name = "study_start_time_at", nullable = false)
    private LocalDateTime studyStartTimeAt;

    @Column(name = "study_end_time_at", nullable = false)
    private LocalDateTime studyEndTimeAt;

    @Column(name = "subject")
    private String subject;

    @Builder
    private StudyTime(User user, LocalDateTime studyStartTimeAt, LocalDateTime studyEndTimeAt, String subject){
        this.user = user;
        this.studyStartTimeAt = studyStartTimeAt;
        this.studyEndTimeAt = studyEndTimeAt;
        this.subject = subject;
    }


    // =========== 비즈니스 로직 =========== //
    // 1. 수정
    public void update(String subject){
        this.subject = subject;
    }



}
