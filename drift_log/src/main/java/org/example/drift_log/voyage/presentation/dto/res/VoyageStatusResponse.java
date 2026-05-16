package org.example.drift_log.voyage.presentation.dto.res;

import jakarta.persistence.Column;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;

public record VoyageStatusResponse(
    // List<City> city 추가 예정
    // 이동 가능한 city List

    VoyageState voyageState,

    Float progress,

    Long departedCityId,

    Long destinationCityId,

    boolean isFamilyReunited
) {

    public static VoyageStatusResponse from(VoyageStatus voyageStatus) {
        // 배가 정박해 있을 때
//        if(voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){
//            return new VoyageStatusResponse(
//                // 도시 리스트
//                // 이동 가능한 도시 리스트
//                VoyageState.ANCHORED,
//                0f,
//                voyageStatus.getDepartedCityId(),
//                voyageStatus.getDestinationCityId(),
//                voyageStatus.isFamilyReunited());
//        }

        // 임시 데이터
        return new VoyageStatusResponse(VoyageState.ANCHORED, 0f, 1l, 2l, false);
    }

}
