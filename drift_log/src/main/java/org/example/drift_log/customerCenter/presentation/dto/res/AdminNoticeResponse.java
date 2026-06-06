package org.example.drift_log.customerCenter.presentation.dto.res;

import java.time.LocalDateTime;
import org.example.drift_log.customerCenter.domain.model.Notice;

public record AdminNoticeResponse(
    Long noticeId,
    String title,
    String content,
    String authorName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt

) {
    public static AdminNoticeResponse of(Notice notice, String authorName){
        return new AdminNoticeResponse(
            notice.getId(),
            notice.getTitle(),
            notice.getContent(),
            authorName, notice.getCreatedAt(),
            notice.getUpdatedAt());
    };
}
