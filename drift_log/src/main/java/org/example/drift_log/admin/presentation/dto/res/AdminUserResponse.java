package org.example.drift_log.admin.presentation.dto.res;


import org.example.drift_log.user.domain.model.User;

public record AdminUserResponse(
    String userId,
    String email,
    String name,
    String userRole,
    String userStatus
) {
    public static AdminUserResponse from(User user){
        return new AdminUserResponse(
            user.getUserId(),
            user.getEmail(),
            user.getName(),
            user.getUserRole().name(),
            user.getUserStatus().name()
        );
    }
}
