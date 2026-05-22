package org.example.drift_log.admin.presentation.dto.res;

import java.time.LocalDateTime;
import java.util.List;
import org.example.drift_log.feedback.domain.model.EndingFeedback;

public record AdminDashboardResponse(
    Long totalUser,
    Long todayUser,
    Long clearUser,
    List<FeedbackInfo> feedbackList
) {
    public static AdminDashboardResponse of(Long totalUser, Long todayUser, Long clearUser, List<EndingFeedback> feedbackList) {
        return new AdminDashboardResponse(
            totalUser,
            todayUser,
            clearUser,
            feedbackList.stream()
                .map(FeedbackInfo::from)
                .toList()
        );

}

    public record FeedbackInfo(
        String userName,
        String content,
        LocalDateTime createdAt
    ) {
        public static FeedbackInfo from(EndingFeedback feedback) {
            return new FeedbackInfo(
                feedback.getUser().getName(),
                feedback.getContent(),
                feedback.getCreatedAt()
            );
        }
    }
}
