package org.example.drift_log.voyage.application;


import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStatusRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;

public interface VoyageService {

    // 1. 현재 배 위치 불러 오기
    public VoyageStatusResponse getVoyageStatus(String userId);

    // 2. 목적지 선택 후 항해 시작
    public VoyageStartResponse voyageStart(VoyageStartRequest request);

}
