package org.example.drift_log.randomEvent.presentation.dto.res;

import org.example.drift_log.randomEvent.domain.model.RandomEvent;

public record RandomEventResponse(
    Long eventId,
    String type,
    String textContent,
    String imageUrl
) {
    public static RandomEventResponse from(RandomEvent event) {
        return new RandomEventResponse(
            event.getId(),
            event.getName(),
            event.getText(),
            event.getImageUrl()
        );
    }
}
