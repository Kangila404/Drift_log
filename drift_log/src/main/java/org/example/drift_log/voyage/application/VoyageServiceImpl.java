package org.example.drift_log.voyage.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStatusRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VoyageServiceImpl implements VoyageService {

    private final UserRepository userRepository;
    private final VoyageStatusRepository voyageStatusRepository;

    @Override
    public VoyageStatusResponse getVoyageStatus(VoyageStatusRequest request) {

        // 1. 클라이언트로부터 온 String userId -> 내부 통신에선, Long으로 voyageStatus 가져올 것
        User user = findUserByUserIdOrThrow(request.userId());

        VoyageStatus voyageStatus = findVoyageStatusByUserId(user.getId());

        // 만약 정박 중이라면 -> 모든 도시 + 항해가능 도시(현재 도시 제외) 반환
        if(voyageStatus.getVoyageState().equals(VoyageState.ANCHORED)){

        }

        //만약 항해 중이라면 -> 모든 도시 + 출발지, 목적지, 진척도 반환
        if(voyageStatus.getVoyageState().equals(VoyageState.SAILING)){

        }

        return VoyageStatusResponse.from(voyageStatus);
    }

    @Override
    public VoyageStartResponse voyageStart(VoyageStartRequest request) {
        return null;
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
}
