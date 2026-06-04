package org.example.drift_log.trace.application;

import java.util.List;

import org.example.drift_log.trace.presentation.dto.res.DiscoveredTraceResponse;

public interface DiscoverdTraceService {
    List<DiscoveredTraceResponse> getDiscoveredTrace(String userId);
}
