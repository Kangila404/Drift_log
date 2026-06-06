package org.example.drift_log.customerCenter.domain.model;

import static jakarta.persistence.FetchType.LAZY;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;

@Entity
@Table(name = "inquiry_answer")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InquiryAnswer extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "answerer_id", nullable = false)
    private Long answererId;

    @OneToOne(fetch = LAZY)
    @JoinColumn(name = "inquiry_id", nullable = false, unique = true)
    private Inquiry inquiry;

    @Builder
    private InquiryAnswer(String content, Long answererId, Inquiry inquiry) {
        this.content = content;
        this.answererId = answererId;
        this.inquiry = inquiry;
    }

    // 답변 내용 수정 (더티체킹 UPDATE)
    void update(String content) {
        this.content = content;
    }
}