package org.example.drift_log.user.presentation.dto.res;

import java.time.LocalDateTime;
import java.util.List;
import org.example.drift_log.user.domain.model.User;

public record UserMeResponse(
    String name,
    String email,
    LocalDateTime createdAt,
    long totalVoyages,
    long visitedCities,
    List<Long> visitedCityIds,
    boolean isFamilyReunited,
    String userRole,
    String authType
) {

    public static UserMeResponse of(
        User user, String email, String authType,
        long totalVoyages, long visitedCities,
        List<Long> visitedCityIds, boolean isFamilyReunited){
        return new UserMeResponse(
            user.getName(),
            email,
            user.getCreatedAt(),
            totalVoyages,
            visitedCities,
            visitedCityIds,
            isFamilyReunited,
            user.getUserRole().name(),
            authType
        );
    }
}