package org.example.drift_log.trace.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.exception.TraceErrorCode;
import org.example.drift_log.trace.exception.TraceException;
import org.example.drift_log.trace.presentation.dto.res.DiscoveredTraceResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DiscoveredTraceServiceImpl implements DiscoverdTraceService {

    private final UserRepository userRepository;
    private final DiscoveredTraceRepository discoveredTraceRepository;

    @Override
    public List<DiscoveredTraceResponse> getDiscoveredTrace(String userId) {
        User user = findUserByUserId(userId);

        return discoveredTraceRepository.findAllByUserId(user.getId())
            .stream()
            .map(DiscoveredTraceResponse::of)
            .toList();
    }


    // ==== 메서드 모음 ==== //
    // 1. (String) userId -> User 조회
    private User findUserByUserId(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(()-> new TraceException(TraceErrorCode.USER_NOT_FOUND));
    }


}
