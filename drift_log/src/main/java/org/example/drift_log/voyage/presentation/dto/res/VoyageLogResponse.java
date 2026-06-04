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
    LocalDateTime createdAt,
    List<EventInfo> events
) {
    public record EventInfo(
        String name,
        String text,
        String imageUrl
    ) {}

    public static VoyageLogResponse from(VoyageLog log) {

        List<EventInfo> events = log.getVoyageEvents().stream()
            .map(ve -> new EventInfo(
                ve.getRandomEvent().getName(),
                ve.getRandomEvent().getText(),
                ve.getRandomEvent().getImageUrl()
            ))
            .toList();

        return new VoyageLogResponse(
            log.getId(),
            log.getFromCity().getName(),
            log.getToCity().getName(),
            log.getAutoText(),
            log.getUserText(),
            log.getWeatherTheme(),
            log.getCreatedAt(),
            events
        );
    }
}