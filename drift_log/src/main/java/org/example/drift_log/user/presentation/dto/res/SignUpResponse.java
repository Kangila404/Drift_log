package org.example.drift_log.user.presentation.dto.res;

import java.util.UUID;
import org.example.drift_log.user.domain.model.User;

public record SignUpResponse(
    String userId
) {

    public static SignUpResponse from(User user){
        return new SignUpResponse(user.getUserId());
    }
}
