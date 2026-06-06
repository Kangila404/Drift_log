package org.example.drift_log.customerCenter.application;

import java.util.List;
import org.example.drift_log.customerCenter.presentation.dto.res.NoticeResponse;

public interface NoticeService {
    List<NoticeResponse> getNotices();
}
