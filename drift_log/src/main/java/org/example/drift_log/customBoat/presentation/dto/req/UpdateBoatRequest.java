package org.example.drift_log.customBoat.presentation.dto.req;

import jakarta.validation.constraints.Min;

public record UpdateBoatRequest(
    @Min(0) int sail,
    @Min(0) int body,
    @Min(0) int lantern
) {

}
