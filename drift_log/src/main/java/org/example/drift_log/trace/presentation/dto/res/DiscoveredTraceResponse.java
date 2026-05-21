package org.example.drift_log.trace.presentation.dto.res;

import java.time.LocalDateTime;
import java.util.List;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;

public record DiscoveredTraceResponse(
    String traceName,
    String cityName,
    String content,
    LocalDateTime discoveredTime
) {

    public static DiscoveredTraceResponse of(DiscoveredTrace discoveredTrace){
        return new DiscoveredTraceResponse(
            discoveredTrace.getTrace().getName(),
            discoveredTrace.getCity().getName(),
            discoveredTrace.getTrace().getContent(),
            discoveredTrace.getDiscoveredAt()
            );
    }

}
