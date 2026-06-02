package org.example.drift_log.user.application;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.example.drift_log.user.presentation.dto.req.UpdateNameRequest;
import org.example.drift_log.user.presentation.dto.req.UpdatePasswordRequest;
import org.example.drift_log.user.presentation.dto.res.UserMeResponse;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@RequiredArgsConstructor
@Service
@Transactional
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VoyageLogRepository voyageLogRepository;
    private final VoyageStatusRepository voyageStatusRepository;

    @Override
    @Transactional(readOnly = true)
    public UserMeResponse getMe(String userId) {
        User user = findUserByUserIdOrThrow(userId);

        List<Long> visitedCityIds = voyageLogRepository.findDistinctToCityIdsByUserId(user.getId());
        long totalVoyages = voyageLogRepository.countByUserId(user.getId());
        long visitedCities = visitedCityIds.size();

        boolean isFamilyReunited = voyageStatusRepository.findByUserId(user.getId())
            .map(VoyageStatus::isFamilyReunited)
            .orElse(false);

        return UserMeResponse.of(user, totalVoyages, visitedCities, visitedCityIds, isFamilyReunited);
    }

    @Override
    public void updateName(String userId, UpdateNameRequest request) {
        User user = findUserByUserIdOrThrow(userId);
        user.updateName(request.name());
        userRepository.save(user);
    }

    @Override
    public void updatePassword(String userId, UpdatePasswordRequest request) {
        User user = findUserByUserIdOrThrow(userId);

        if(!passwordEncoder.matches(request.currentPassword(), user.getPassword())){
            throw new UserException(UserErrorCode.INVALID_PASSWORD);
        }

        if(!request.newPassword().equals(request.newPasswordConfirm())){
            throw new UserException(UserErrorCode.PASSWORD_NOT_MATCHED);
        }

        user.updatePassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }


    // =========== 메서드 ========== //
    private User findUserByUserIdOrThrow(String userId){
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND));
    }
}

