package org.example.drift_log.admin.application;

import java.util.List;
import org.example.drift_log.admin.presentation.dto.res.AdminDashboardResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserDetailResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserResponse;

public interface AdminService {
    AdminDashboardResponse getDashboard();

    List<AdminUserResponse> getUserList();

    AdminUserDetailResponse getUserDetail(String userId);

    void banUser(String userId);

    void activateUser(String userId);
}
