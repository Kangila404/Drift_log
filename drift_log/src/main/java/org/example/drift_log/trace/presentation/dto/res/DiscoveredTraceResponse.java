package org.example.drift_log.trace.presentation.dto.res;

import java.time.LocalDateTime;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;

public record DiscoveredTraceResponse(
    String familyMember,
    String traceName,
    String cityName,
    String content,
    String imageUrl,
    LocalDateTime discoveredTime
) {
    public static DiscoveredTraceResponse of(DiscoveredTrace discoveredTrace){
        return new DiscoveredTraceResponse(
            discoveredTrace.getTrace().getFamilyMember().name(),
            discoveredTrace.getTrace().getName(),
            discoveredTrace.getCity().getName(),
            discoveredTrace.getTrace().getContent(),
            discoveredTrace.getTrace().getImageUrl(),
            discoveredTrace.getDiscoveredAt()
        );
    }
}
