package org.example.drift_log.voyage.presentation.dto.res;

import org.example.drift_log.city.domain.model.CityRoute;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;

public record VoyageStatusResponse(

    VoyageState voyageState,

    Float progress,

    Long currentCityId,

    Long departedCityId,

    Long destinationCityId,

    boolean isFamilyReunited,

    Integer remainingSeconds
) {

    public static VoyageStatusResponse from(VoyageStatus voyageStatus) {
        return new VoyageStatusResponse(
            voyageStatus.getVoyageState(),
            voyageStatus.getProgress(),
            voyageStatus.getCurrentCityId(),
            voyageStatus.getDepartedCityId(),
            voyageStatus.getDestinationCityId(),
            voyageStatus.isFamilyReunited(),
            null
            );
    }

    public static VoyageStatusResponse fromSailing(VoyageStatus voyageStatus, CityRoute cityRoute) {
        int totalSeconds = cityRoute.getDurationMinutes() * 60;
        int remaining = (int)(totalSeconds * (1 - voyageStatus.getProgress()));
        return new VoyageStatusResponse(
            voyageStatus.getVoyageState(),
            voyageStatus.getProgress(),
            voyageStatus.getCurrentCityId(),
            voyageStatus.getDepartedCityId(),
            voyageStatus.getDestinationCityId(),
            voyageStatus.isFamilyReunited(),
            Math.max(0, remaining)
        );
    }

}
