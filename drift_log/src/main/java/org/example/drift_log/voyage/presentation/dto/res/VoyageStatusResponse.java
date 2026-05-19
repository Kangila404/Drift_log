package org.example.drift_log.voyage.presentation.dto.res;

import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;

public record VoyageStatusResponse(

    VoyageState voyageState,

    Float progress,

    Long departedCityId,

    Long destinationCityId,

    boolean isFamilyReunited
) {

    public static VoyageStatusResponse from(VoyageStatus voyageStatus) {
        return new VoyageStatusResponse(VoyageState.SAILING, voyageStatus.getProgress(), voyageStatus.getDepartedCityId(), voyageStatus.getDestinationCityId(), voyageStatus.isFamilyReunited());
    }

}
