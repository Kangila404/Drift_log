package org.example.drift_log.voyage.presentation.dto.res;

import java.time.LocalDateTime;
import java.util.List;
import org.example.drift_log.voyage.domain.entity.VoyageLog;

public record VoyageLogResponse(
    Long logId,
    String fromCity,
    String toCity,
    String autoText,
    String userText,
    String weatherTheme,
    LocalDateTime createdAt
) {
    public static VoyageLogResponse from(VoyageLog log) {
        return new VoyageLogResponse(
            log.getId(),
            log.getFromCity().getName(),
            log.getToCity().getName(),
            log.getAutoText(),
            log.getUserText(),
            log.getWeatherTheme(),
            log.getCreatedAt()
        );
    }
}
