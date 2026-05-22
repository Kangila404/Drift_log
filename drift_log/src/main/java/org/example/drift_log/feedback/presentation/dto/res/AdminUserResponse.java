package org.example.drift_log.feedback.presentation.dto.res;


import org.example.drift_log.user.domain.model.User;

public record AdminUserResponse(
    String userId,
    String email,
    String name,
    String userRole
) {
    public static AdminUserResponse from(User user){
        return new AdminUserResponse(
            user.getUserId(),
            user.getEmail(),
            user.getName(),
            user.getUserRole().name()
        );
    }
}
