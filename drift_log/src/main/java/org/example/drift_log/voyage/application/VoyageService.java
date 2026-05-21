package org.example.drift_log.voyage.application;


import org.example.drift_log.voyage.presentation.dto.res.VoyageResumeResponse;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageCompleteResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStopResponse;

public interface VoyageService {

    // 1. 현재 배 위치 불러 오기
    public VoyageStatusResponse getVoyageStatus(String userId);

    // 2. 목적지 선택 후 항해 시작
    public VoyageStartResponse voyageStart(String userId, VoyageStartRequest request);

    // 3. 항해 중 일시 정지
    public VoyageStopResponse voyageStop(String userId);

    // 4. 일시 정지 후 -> 항해 재개
    public VoyageResumeResponse voyageResume(String userId);

    // 5. 항해 종료
    public VoyageCompleteResponse voyageComplete(String userId);

}
