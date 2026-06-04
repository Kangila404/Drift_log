package org.example.drift_log.voyage.presentation.dto.res;

import java.util.List;

public record VoyageStartResponse(
    List<VoyageDto> voyages,
    List<SceneDto> sceneDtos

) {
    public static VoyageStartResponse from(){
        return new VoyageStartResponse(null,null);
    }


    public record VoyageDto(
        Long id,
        String cityName,
        double directionAngle
    ){}

    public record SceneDto(
        String bgmUrl,
        String imgUrl
    ){}
}
