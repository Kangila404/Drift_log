package org.example.drift_log.voyage.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.exception.VoyageErrorCode;
import org.example.drift_log.voyage.exception.VoyageException;
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
    public WriteVoyageLogResponse writeLog(String userId, Long logId, WriteVoyageLogRequest request) {

        VoyageLog voyageLog = findVoyageByIdOrThrow(logId);

        User user = findUserByIdOrThrow(voyageLog.getUserId());

        if(!user.getUserId().equals(userId)){
            throw new VoyageException(VoyageErrorCode.VOYAGE_LOG_NOT_OWNER);
        }

        voyageLog.writeVoyageLog(request.userText());

        voyageLogRepository.save(voyageLog);

        return WriteVoyageLogResponse.from(voyageLog);
    }



    // ========= 메서드 모음 ========= //
    // 1. logId -> VoyageLog 조회
    private VoyageLog findVoyageByIdOrThrow(Long logId){
        return voyageLogRepository.findById(logId)
            .orElseThrow(()-> new VoyageException(VoyageErrorCode.VOYAGE_LOG_NOT_FOUND));
    }


    // 3. (String) userId -> User 조회
    private User findUserByUserId(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(()->new VoyageException(VoyageErrorCode.USER_NOT_FOUND));
    }

    // 4. Long userId -> User 조회
    private User findUserByIdOrThrow(Long userId){
        return userRepository.findById(userId)
            .orElseThrow(()->new VoyageException(VoyageErrorCode.USER_NOT_FOUND));
    }
}
