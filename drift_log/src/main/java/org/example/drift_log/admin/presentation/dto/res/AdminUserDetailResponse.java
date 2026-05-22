package org.example.drift_log.admin.presentation.dto.res;

import java.util.List;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.voyage.domain.entity.VoyageLog;

public record AdminUserDetailResponse(
    String userId,
    String email,
    String name,
    String authType,
    String userRole,
    String userStatus,
    String lastLoginAt,
    boolean isStoryClear,
    String endingFeedback,
    List<VoyageLogInfo> voyageLogInfo
) {

    // ======== VoyageLogInfo ======== //
    public record VoyageLogInfo(
        String fromCity,
        String toCity,
        String autoText,
        String userText,
        String weatherTheme
    ){

        public static VoyageLogInfo from(VoyageLog voyageLog){
            return new VoyageLogInfo(
                voyageLog.getFromCity().getName(),
                voyageLog.getToCity().getName(),
                voyageLog.getAutoText(),
                voyageLog.getUserText(),
                voyageLog.getWeatherTheme()
            );
        }

    }

    // ======== VoyageLogInfo ======== //

    public static AdminUserDetailResponse of(
        User user,
        boolean isStoryClear,
        String endingFeedback,
        List<VoyageLog> voyageLogList){
        return new AdminUserDetailResponse(
            user.getUserId(),
            user.getEmail(),
            user.getName(),
            user.getAuthType().name(),
            user.getUserRole().name(),
            user.getUserStatus().name(),
            user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : null,
            isStoryClear,
            endingFeedback,
            voyageLogList
                .stream()
                .map(VoyageLogInfo::from)
                .toList()
        );
    }

}
