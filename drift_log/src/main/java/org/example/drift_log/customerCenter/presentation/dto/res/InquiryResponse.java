package org.example.drift_log.customerCenter.presentation.dto.res;

import java.time.LocalDateTime;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.example.drift_log.customerCenter.domain.model.InquiryAnswer;

public record InquiryResponse(
    Long inquiryId,
    String title,
    String content,
    String authorName,
    String inquiryStatus,
    String answerContent,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static InquiryResponse of(Inquiry inquiry, String authorName) {
        InquiryAnswer answer = inquiry.getInquiryAnswer();
        return new InquiryResponse(
            inquiry.getId(),
            inquiry.getTitle(),
            inquiry.getContent(),
            authorName,
            inquiry.getInquiryStatus().toString(),
            answer != null ? answer.getContent() : null,
            inquiry.getCreatedAt(),
            inquiry.getUpdatedAt()
        );
    }
}