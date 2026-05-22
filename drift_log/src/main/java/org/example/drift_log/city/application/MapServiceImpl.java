package org.example.drift_log.city.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.city.exception.CityErrorCode;
import org.example.drift_log.city.exception.CityException;
import org.example.drift_log.city.presentation.dto.res.MapResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MapServiceImpl implements MapService{

    private final CityRepository cityRepository;
    private final UserRepository userRepository;
    private final VoyageStatusRepository voyageStatusRepository;

    @Override
    public MapResponse getMap(String userId) {
        // 유저 현재 위치 반환
        User user = getUserByUserIdOrThrow(userId);
        VoyageStatus voyageStatus = getVoyageStatusByUserIdOrThrow(user.getId());

        // 공통) 전체
        List<City> cities = cityRepository.findAll();

        // 1-1) 만약 유저가 정박 중이라면 -> 모든 도시 정보 , 정박한 도시 반환
        if(voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){
            City currentCity = getCityByCityId(voyageStatus.getCurrentCityId());
            return MapResponse.ofAnchored(cities, currentCity);
        }
        // 1-2) 만약 유저가 현재 항해 상태라면 -> 모든 도시 정보, 출발 도시, 목적 도시 반환
        if(voyageStatus.getVoyageState().equals(VoyageState.SAILING)){
            City departedCity = getCityByCityId(voyageStatus.getDepartedCityId());
            City destinationCity = getCityByCityId(voyageStatus.getDestinationCityId());
            return MapResponse.ofSailing(cities, departedCity, destinationCity, voyageStatus.getProgress());  }
        throw new CityException(CityErrorCode.UNKNOWN_VOYAGE_STATE);
    }



    // ======== 리포지토리 조회 메서드 ======== //
    // 1. userId -> user.id 조회
    private User getUserByUserIdOrThrow(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(()-> new CityException(CityErrorCode.USER_NOT_FOUND));
    }
    // 2. user.id -> VoyageStatus 조회
    private VoyageStatus getVoyageStatusByUserIdOrThrow(Long userId) {
        return voyageStatusRepository.findByUserId(userId)
            .orElseThrow(()-> new IllegalArgumentException("voyage : 항해 일지를 찾을 수 없습니다."));
    }

    // 3. cityId -> City 조회
    private City getCityByCityId(Long cityId) {
        return cityRepository.findById(cityId)
            .orElseThrow(()-> new CityException(CityErrorCode.CITY_NOT_FOUND));
    }
}
