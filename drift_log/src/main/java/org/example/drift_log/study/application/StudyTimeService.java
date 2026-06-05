package org.example.drift_log.study.application;

import java.util.List;
import org.example.drift_log.study.presentation.dto.req.StudyTimeRequest;
import org.example.drift_log.study.presentation.dto.res.StudySummaryResponse;
import org.example.drift_log.study.presentation.dto.res.StudyTimeResponse;

public interface StudyTimeService {
    StudyTimeResponse save(String userId, StudyTimeRequest request);

    StudySummaryResponse getSummary(String userId);

    List<StudyTimeResponse> getLogs(String userId);

    StudyTimeResponse updateSubject(String userId, Long studyTimeId, String subject);

    void delete(String userId, Long studyTimeId);
}
