package org.example.drift_log.feedback.application;

import org.example.drift_log.feedback.presentation.dto.req.EndingFeedBackRequest;
import org.example.drift_log.feedback.presentation.dto.res.EndingFeedBackResponse;

public interface FeedBackService {
    EndingFeedBackResponse writeFeedback(String userId, EndingFeedBackRequest request);
}
