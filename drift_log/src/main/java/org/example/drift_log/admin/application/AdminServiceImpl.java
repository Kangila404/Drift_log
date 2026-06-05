package org.example.drift_log.admin.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.drift_log.admin.domain.model.AppVersion;
import org.example.drift_log.admin.domain.repository.AppVersionRepository;
import org.example.drift_log.admin.exception.AdminErrorCode;
import org.example.drift_log.admin.exception.AdminException;
import org.example.drift_log.admin.presentation.dto.req.UpdateVersionRequest;
import org.example.drift_log.admin.presentation.dto.res.AdminDashboardResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserDetailResponse;
import org.example.drift_log.admin.presentation.dto.res.UpdateVersionResponse;
import org.example.drift_log.admin.presentation.dto.res.VersionResponse;
import org.example.drift_log.feedback.domain.model.EndingFeedback;
import org.example.drift_log.feedback.domain.repository.EndingFeedBackRepository;
import org.example.drift_log.admin.presentation.dto.res.AdminUserResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Transactional
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService{

    private final UserRepository userRepository;
    private final EndingFeedBackRepository endingFeedBackRepository;
    private final VoyageStatusRepository voyageStatusRepository;
    private final VoyageLogRepository voyageLogRepository;
    private final AppVersionRepository appVersionRepository;

    // 디폴트 버전
    private static final String DEFAULT_VERSION = "v1.0.0";

    @Override
    public AdminDashboardResponse getDashboard() {

        // 전체 유저 수
        Long totalUser = userRepository.count();
        // 오늘 방문 유저 : 마지막 로그인이 오늘인 유저
        Long todayUser = userRepository.countByLastLoginAtAfter(LocalDate.now(ZoneId.of("Asia/Seoul")).atStartOfDay());
        // 스토리 클리어 유저 수
        Long clearUsers = voyageStatusRepository.countClearUser();

        // 모든 피드백
        List<EndingFeedback> feedbackList = endingFeedBackRepository.findAll();

        return AdminDashboardResponse.of(totalUser, todayUser, clearUsers, feedbackList);
    }

    @Override
    public List<AdminUserResponse> getUserList() {
        return userRepository.findAll()
            .stream()
            .map(AdminUserResponse::from)
            .toList();
    }

    @Override
    public AdminUserDetailResponse getUserDetail(String userId) {
        // 유저 정보
        User user = findUserByUserIdOrThrow(userId);

        VoyageStatus voyageStatus = voyageStatusRepository.findByUserId(user.getId())
            .orElseThrow(() -> new AdminException(AdminErrorCode.VOYAGE_STATUS_NOT_FOUND));
        // 스토리 클리어 유무
        boolean isStoryClear = voyageStatus.isFamilyReunited();

        // 엔딩 피드백
        EndingFeedback feedback = endingFeedBackRepository.findByUserId(user.getId())
            .orElse(null);

        String feedbackContent = feedback != null ? feedback.getContent() : null;

        // 항해일지
        List<VoyageLog> voyageLogList = voyageLogRepository.findAllByUserId(user.getId());

        return AdminUserDetailResponse.of(user, isStoryClear, feedbackContent, voyageLogList);
    }

    @Override
    public void banUser(String userId) {
        User user = findUserByUserIdOrThrow(userId);
        user.banUser();
        userRepository.save(user);
    }

    @Override
    public void activateUser(String userId) {
        User user = findUserByUserIdOrThrow(userId);
        user.activateUser();
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    @Override
    public VersionResponse getVersion() {
        return appVersionRepository.findLatestAppVersion()
            .map(VersionResponse::from)
            .orElseGet(() -> VersionResponse.of(DEFAULT_VERSION));
    }


    @Override
    public UpdateVersionResponse updateVersion(UpdateVersionRequest request) {
        AppVersion appVersion = appVersionRepository.findLatestAppVersion()
            .orElseGet(() -> AppVersion.create(request.version()));
        appVersion.updateVersion(request.version());
        appVersionRepository.save(appVersion);
        return UpdateVersionResponse.from("success");
    }


    // ==== 메서드 모음 ==== //
    // 1. (String)userId -> User 찾기
    private User findUserByUserIdOrThrow(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(()-> new AdminException(AdminErrorCode.ADMIN_USER_NOT_FOUND));
    }

    // 2. 최신 버전 찾기
    private Optional<AppVersion> findLatestAppVersion(){
        return appVersionRepository.findLatestAppVersion();

    }
}
