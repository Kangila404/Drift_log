package org.example.drift_log.voyage.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.example.drift_log.voyage.presentation.dto.res.VoyageResumeResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageCompleteResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStopResponse;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
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
    private final VoyageLogRepository voyageLogRepository;
    private final TraceRepository traceRepository;
    private final DiscoveredTraceRepository discoveredTraceRepository;
    private final CityRepository cityRepository;
    private final WeatherThemeRepository weatherThemeRepository;

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
    public VoyageStartResponse voyageStart(String userId, VoyageStartRequest request) {
        User user = findUserByUserIdOrThrow(userId);
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        // ======= 검증 ========= //
        // 1. 항해 상태가 ANCHORED가 아닐 때 -> 예외
        if(!voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){
            throw new IllegalArgumentException("현재 정박 중이 아닙니다");
        }
        // 2. 목적지가 실제로 있는 도시인지 확인
        validateCityId(request.destinationCityId());
        // 3. 같은 도시를 보내는 게 아닌지 확인
        if(request.destinationCityId().equals(voyageStatus.getCurrentCityId())){
            throw new IllegalArgumentException("같은 도시로 이동할 수 없습니다");
        }


        voyageStatus.startSailing(request.destinationCityId());

        voyageStatusRepository.save(voyageStatus);

        return VoyageStartResponse.from();
    }

    // 항해 중 -> 일시 정지
    @Override
    public VoyageStopResponse voyageStop(String userId) {
        User user = findUserByUserIdOrThrow(userId);
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
    public VoyageResumeResponse voyageResume(String userId) {
        User user = findUserByUserIdOrThrow(userId);
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        if(!voyageStatus.getVoyageState().equals(VoyageState.PAUSED)){
            throw new IllegalStateException("일시정지 중이 아닙니다.");
        }

        voyageStatus.resume();
        voyageStatusRepository.save(voyageStatus);
        return new VoyageResumeResponse("success");
    }

    @Override
    public VoyageCompleteResponse voyageComplete(String userId) {
        User user = findUserByUserIdOrThrow(userId);
        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        if(!voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){
            throw new IllegalStateException("도착 상태가 아닙니다.");
        }

        Long departedCityId = voyageStatus.getDepartedCityId();
        Long arrivedCityId = voyageStatus.getCurrentCityId();

        City arrivedCity = findCityByIdORThrow(arrivedCityId);
        City departedCity = findCityByIdORThrow(departedCityId);

        String autoText = departedCity.getName() + "을(를) 떠나 " + arrivedCity.getName() + "에 도착했다.";

        WeatherTheme todayWeatherTheme = weatherThemeRepository.findByDate(LocalDate.now(ZoneId.of("Asia/Seoul")))
            .orElse(null);


        // 날씨 없을 때 기본 값
        String weatherThemeName = todayWeatherTheme != null
            ? todayWeatherTheme.getTheme().getTheme()
            : "잔잔한 수면";

        // 1. Voyage 로그 생성
        VoyageLog voyageLog = VoyageLog.builder()
            .userId(user.getId())
            .fromCity(departedCity)
            .toCity(arrivedCity)
            .autoText(autoText)
            .weatherTheme(weatherThemeName)
            .build();

        voyageLogRepository.save(voyageLog);


// 2. 도착 시 -> Trace 조회
        Trace trace = findByCityIdOrNull(arrivedCityId);

// 흔적 있을 때만 처리
        if(trace != null){
            DiscoveredTrace discoveredTrace = findByUserIdAndTraceIdOrNull(user.getId(), trace.getId());
            if(discoveredTrace == null){
                discoveredTrace = DiscoveredTrace.builder()
                    .userId(user.getId())
                    .trace(trace)
                    .city(arrivedCity)
                    .discoveredAt(LocalDateTime.now())
                    .build();
                discoveredTraceRepository.save(discoveredTrace);
            }
        }

        // 2. 엔딩 체크
        boolean isEnding = checkEndingCondition(user.getId(), arrivedCityId, voyageStatus);
        if(isEnding){
            voyageStatus.familyReunited();
        }


        // 3. complete 호출
        voyageStatus.complete();
        voyageStatusRepository.save(voyageStatus);

        return VoyageCompleteResponse.of(arrivedCity, trace, voyageLog, isEnding);
    }


    // ========== 조회 메서드 ========== //
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

    // 4. CityId -> Trace(흔적) 조회
    private Trace findByCityIdOrNull(Long cityId){
        return traceRepository.findByCityId(cityId)
            .orElse(null);
    }

    // 5. Long userId -> discoveredTrace 조회
    private DiscoveredTrace findByUserIdAndTraceIdOrNull(Long userId, Long traceId){
        return discoveredTraceRepository.findByUserIdAndTraceId(userId, traceId)
            .orElse(null);
    }

    // 6. cityId -> City 조회
    private City findCityByIdORThrow(Long cityId){
        return cityRepository.findById(cityId)
            .orElseThrow(()-> new IllegalArgumentException("해당 도시는 존재하지 않습니다"));
    }

    // ====== 검증 메서드 ======= //
    // 1. 도시 아이디가 있는지를 검증
    private void validateCityId(Long cityId){
        if(!cityRepository.existsById(cityId)){
            throw new IllegalArgumentException("존재하지 않는 도시입니다");
        }
    }

    // 2. 유저가 엔딩 조건을 만족했는지 검증
    private boolean checkEndingCondition(Long userId, Long arrivedCityId, VoyageStatus voyageStatus){
        // 이미 엔딩 봤으면 false (연출 다시 안 보여줌)
        if(voyageStatus.isFamilyReunited()) return false;

        // 1. 조건 1 : 강원도(cityId = 4)에 도착
        if(!arrivedCityId.equals(4L)){
            return false;
        }
        // 조건 2: 모든 도시 방문 여부 (서울 제외 4개 도시)
        long visitedCityCount = voyageLogRepository.countDistinctToCityByUserId(userId);
        if(visitedCityCount < 4){
            return false;
        }

        // 조건 3: 모든 흔적 수집 여부 (흔적 4개)
        long discoveredTraceCount = discoveredTraceRepository.countByUserId(userId);
        return discoveredTraceCount >= 4;
    }

}
