package org.example.drift_log.user.application;

import org.example.drift_log.user.presentation.dto.req.UpdateNameRequest;
import org.example.drift_log.user.presentation.dto.req.UpdatePasswordRequest;
import org.example.drift_log.user.presentation.dto.res.UserMeResponse;
import org.hibernate.sql.Update;

public interface UserService {

    UserMeResponse getMe(String userId);

    void updateName(String userId, UpdateNameRequest request);

    void updatePassword(String userId, UpdatePasswordRequest request);
}
