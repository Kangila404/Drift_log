package org.example.drift_log.city.application;

import org.example.drift_log.city.presentation.dto.res.DurationTimeResponse;
import org.example.drift_log.city.presentation.dto.res.MapResponse;

public interface MapService {

    MapResponse getMap(String userId);

    DurationTimeResponse getRoutes(String userId, Long toCityId);

}
