package org.example.drift_log.customerCenter.presentation.dto.res;

import java.time.LocalDateTime;
import org.example.drift_log.customerCenter.domain.model.Notice;

public record NoticeResponse(
    Long noticeId,
    String title,
    String content,
    String authorName,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static NoticeResponse of(Notice notice, String authorName){
        return new NoticeResponse(
            notice.getId(),
            notice.getTitle(),
            notice.getContent(),
            authorName, notice.getCreatedAt(),
            notice.getUpdatedAt());
        }

}
