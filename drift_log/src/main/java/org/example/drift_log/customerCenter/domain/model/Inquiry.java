package org.example.drift_log.customerCenter.domain.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.example.drift_log.common.entity.BaseEntity;
import org.example.drift_log.customerCenter.domain.enums.InquiryStatus;
import org.example.drift_log.customerCenter.exception.CustomerCenterErrorCode;
import org.example.drift_log.customerCenter.exception.CustomerCenterException;

@Getter
@Table(name = "inquiry")
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Inquiry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InquiryStatus inquiryStatus;

    @OneToOne(mappedBy = "inquiry", cascade = CascadeType.ALL,
        orphanRemoval = true, fetch = FetchType.LAZY)   // ← true 로 변경
    private InquiryAnswer inquiryAnswer;

    @Builder
    private Inquiry(String title, String content, Long authorId) {
        this.title = title;
        this.content = content;
        this.authorId = authorId;
        this.inquiryStatus = InquiryStatus.OPEN;
    }

    // ============ 비즈니스 로직 ============ //

    // 1. 문의 본문 수정
    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    // 2. 답변 등록 — 자식 연결 + 상태 전이 (cascade INSERT)
    public void answer(String content, Long answererId) {
        if (this.inquiryStatus == InquiryStatus.ANSWERED) {
            throw new CustomerCenterException(CustomerCenterErrorCode.ALREADY_ANSWERED);
        }
        this.inquiryAnswer = InquiryAnswer.builder()
            .content(content)
            .answererId(answererId)
            .inquiry(this)
            .build();
        this.inquiryStatus = InquiryStatus.ANSWERED;
    }

    // 3. 답변 수정 — 자식 필드 변경
    public void updateAnswer(String content) {
        if (this.inquiryAnswer == null) {
            throw new CustomerCenterException(CustomerCenterErrorCode.ANSWER_NOT_FOUND);
        }
        this.inquiryAnswer.update(content);
    }

    // 4. 답변 삭제 — 자식 연결 끊기 + 상태 복귀
    public void deleteAnswer() {
        if (this.inquiryAnswer == null) {
            throw new CustomerCenterException(CustomerCenterErrorCode.ANSWER_NOT_FOUND);
        }
        this.inquiryAnswer = null;
        this.inquiryStatus = InquiryStatus.OPEN;
    }
}