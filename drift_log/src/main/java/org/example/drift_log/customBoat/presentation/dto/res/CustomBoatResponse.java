package org.example.drift_log.customBoat.presentation.dto.res;

import org.example.drift_log.customBoat.domain.model.CustomBoat;

public record CustomBoatResponse(
    int sail,
    int body,
    int lantern
) {
    public static CustomBoatResponse of(CustomBoat boat){
        return new CustomBoatResponse(boat.getSail(), boat.getBody(), boat.getLantern());
    }
}
