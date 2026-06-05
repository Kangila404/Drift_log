package org.example.drift_log.admin.application;

import java.util.List;
import org.example.drift_log.admin.presentation.dto.req.UpdateVersionRequest;
import org.example.drift_log.admin.presentation.dto.res.AdminDashboardResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserDetailResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserResponse;
import org.example.drift_log.admin.presentation.dto.res.UpdateVersionResponse;
import org.example.drift_log.admin.presentation.dto.res.VersionResponse;

public interface AdminService {
    AdminDashboardResponse getDashboard();

    List<AdminUserResponse> getUserList();

    AdminUserDetailResponse getUserDetail(String userId);

    void banUser(String userId);

    void activateUser(String userId);

    VersionResponse getVersion();

    UpdateVersionResponse updateVersion(UpdateVersionRequest request);
}
