package org.example.drift_log.voyage.application;

import java.util.List;
import org.example.drift_log.voyage.presentation.dto.req.WriteVoyageLogRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageLogResponse;
import org.example.drift_log.voyage.presentation.dto.res.WriteVoyageLogResponse;

public interface VoyageLogService {
    List<VoyageLogResponse> getLogList(String userId);

    WriteVoyageLogResponse writeLog(Long logId, WriteVoyageLogRequest request);
}
