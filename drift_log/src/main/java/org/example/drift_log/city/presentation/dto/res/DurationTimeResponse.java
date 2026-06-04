package org.example.drift_log.city.presentation.dto.res;

import org.example.drift_log.city.domain.model.CityRoute;

public record DurationTimeResponse(
    Integer durationTime
) {

    public static DurationTimeResponse from(CityRoute route){
        return new DurationTimeResponse(
            route.getDurationMinutes()
        );
    }

}
