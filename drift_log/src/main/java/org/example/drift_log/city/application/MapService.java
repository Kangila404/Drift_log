package org.example.drift_log.city.application;

import org.example.drift_log.city.presentation.dto.res.MapResponse;

public interface MapService {

    MapResponse getMap(String userId);

}
