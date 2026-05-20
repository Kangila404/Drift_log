package org.example.drift_log.voyage.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.presentation.dto.req.WriteVoyageLogRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageLogResponse;
import org.example.drift_log.voyage.presentation.dto.res.WriteVoyageLogResponse;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class VoyageLogServiceImpl implements VoyageLogService{

    private final VoyageLogRepository voyageLogRepository;
    private final UserRepository userRepository;

    @Override
    public List<VoyageLogResponse> getLogList(String userId) {
        User user = findUserByUserId(userId);
        return voyageLogRepository.findAllByUserId(user.getId())
            .stream()
            .map(VoyageLogResponse::from)
            .toList();
    }

    @Override
    public WriteVoyageLogResponse writeLog(Long logId, WriteVoyageLogRequest request) {

        VoyageLog voyageLog = findVoyageByIdOrThrow(logId);

        voyageLog.writeVoyageLog(request.userText());

        voyageLogRepository.save(voyageLog);

        return WriteVoyageLogResponse.from(voyageLog);
    }



    // ========= 메서드 모음 ========= //
    // 1. logId -> VoyageLog 조회
    private VoyageLog findVoyageByIdOrThrow(Long logId){
        return voyageLogRepository.findById(logId)
            .orElseThrow(()-> new IllegalArgumentException("해당 항해 기록을 조회할 수 없습니다."));
    }


    // 3. (String) userId -> User 조회
    private User findUserByUserId(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(()->new IllegalArgumentException("존재하지 않는 유저입니다."));
    }

}
