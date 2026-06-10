package org.example.drift_log.customBoat.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.customBoat.domain.model.CustomBoat;
import org.example.drift_log.customBoat.domain.repository.CustomBoatRepository;
import org.example.drift_log.customBoat.presentation.dto.req.UpdateBoatRequest;
import org.example.drift_log.customBoat.presentation.dto.res.CustomBoatResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CustomBoatServiceImpl implements CustomBoatService {

    private final CustomBoatRepository customBoatRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public CustomBoatResponse getMyBoat(String userId) {
        User user = findUserIdOrThrow(userId);
        CustomBoat boat = customBoatRepository.findByUserId(user.getId())
            .orElseGet(()-> CustomBoat.createDefault(user.getId()));
        return CustomBoatResponse.of(boat);
    }

    @Override
    public void updateBoat(String userId, UpdateBoatRequest request) {
        User user = findUserIdOrThrow(userId);
        CustomBoat boat = customBoatRepository.findByUserId(user.getId())
            .orElseGet(()-> CustomBoat.createDefault(user.getId()));

        boat.updateColors(request.sail(), request.body(), request.lantern());
        customBoatRepository.save(boat);
    }


    // =============== 메서드 =============== //
    // 1. (String) UserId -> User 조회
    private User findUserIdOrThrow(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(()-> new UserException(UserErrorCode.USER_NOT_FOUND));
    }
}
