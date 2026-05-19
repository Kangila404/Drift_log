package org.example.drift_log.voyage.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.presentation.dto.req.VoyageResumeResponse;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStopRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageResumeRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStopResponse;
import org.springframework.transaction.annotation.Transactional;
import org.example.drift_log.city.domain.model.CityRoute;
import org.example.drift_log.city.domain.repository.CityRouteRepository;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class VoyageServiceImpl implements VoyageService {

    private final UserRepository userRepository;
    private final VoyageStatusRepository voyageStatusRepository;
    private final CityRouteRepository cityRouteRepository;

    // 1. 항해 상태 조회
    @Override
    public VoyageStatusResponse getVoyageStatus(String userId) {

        // 1) 클라이언트로부터 온 String userId -> 내부 통신에선, Long으로 voyageStatus 가져올 것
        User user = findUserByUserIdOrThrow(userId);

        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        if(!voyageStatus.getVoyageState().equals(VoyageState.SAILING)){
            throw new IllegalStateException("현재 항해 중이 아닙니다.");
        }

        // 2) 조회(10 초 폴링)마다 -> 진척률 갱신
        CityRoute cityRoute = findCityRouteByCityIdsOrThrow(voyageStatus.getDepartedCityId(), voyageStatus.getDestinationCityId());
        float delta = 10f / (cityRoute.getDurationMinutes() * 60f);
        voyageStatus.updateProgress(delta);

        // 진척률 >= 1.0 -> 도착
        if(voyageStatus.getProgress() >= 1.0f){
            voyageStatus.arrive();
        }

        voyageStatusRepository.save(voyageStatus);

        return VoyageStatusResponse.from(voyageStatus);
    }

    // 2. 항해 시작
    @Override
    public VoyageStartResponse voyageStart(VoyageStartRequest request) {
        User user = findUserByUserIdOrThrow(request.userId());
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        // 항해 상태가 ANCHORED가 아닐 때 -> 예외
        if(!voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){
            throw new IllegalArgumentException("현재 정박 중이 아닙니다");
        }

        // City 개발 후 진행 예정

        return VoyageStartResponse.from();
    }

    // 항해 중 -> 일시 정지
    @Override
    public VoyageStopResponse voyageStop(VoyageStopRequest request) {
        User user = findUserByUserIdOrThrow(request.userId());
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        if(!voyageStatus.getVoyageState().equals(VoyageState.SAILING)){
            throw new IllegalStateException("항해 중이 아닙니다.");
        }

        voyageStatus.pause();
        voyageStatusRepository.save(voyageStatus);
        return new VoyageStopResponse("success");
    }

    // 일시정지 -> 항해 재개
    @Override
    public VoyageResumeResponse voyageResume(VoyageResumeRequest request) {
        User user = findUserByUserIdOrThrow(request.userId());
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        if(!voyageStatus.getVoyageState().equals(VoyageState.PAUSED)){
            throw new IllegalStateException("일시정지 중이 아닙니다.");
        }

        voyageStatus.resume();
        voyageStatusRepository.save(voyageStatus);
        return new VoyageResumeResponse("success");
    }


    // ========== ========== //
    // 1. String userId -> user 조회
    private User findUserByUserIdOrThrow(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(()->new IllegalArgumentException("알맞은 유저가 아닙니다"));
    }

    // 2. Long userId -> VoyageStatus 조회
    private VoyageStatus findVoyageStatusByUserId(Long userId){
            VoyageStatus voyageStatus = voyageStatusRepository.findByUserId(userId)
            .orElse(null);

            // 항해 상태 x -> 초기화
            if(voyageStatus == null){
                return VoyageStatus.builder()
                    .userId(userId)
                    .voyageState(VoyageState.ANCHORED)
                    .progress(0f)
                    .build();
            }

            return voyageStatus;
    }

    // 3. VoyageStatus -> CityRoute 조회
    private CityRoute findCityRouteByCityIdsOrThrow(Long departedCityId, Long destinationCityId){
        return cityRouteRepository.findByFromCityIdAndToCityId(departedCityId, destinationCityId)
            .orElseThrow(()-> new IllegalArgumentException("해당 경로가 존재하지 않습니다."));
    }
}
