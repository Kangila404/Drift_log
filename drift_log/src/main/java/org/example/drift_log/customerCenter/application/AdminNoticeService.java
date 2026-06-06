package org.example.drift_log.customerCenter.application;

import java.util.List;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.AdminNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteNoticeResponse;

public interface AdminNoticeService {

    List<AdminNoticeResponse> getNotices();

    WriteNoticeResponse writeNotice(String userId, WriteNoticeRequest request);

    UpdateNoticeResponse updateNotice(Long noticeId, UpdateNoticeRequest request);

    void deleteNotice(Long noticeId);
}
