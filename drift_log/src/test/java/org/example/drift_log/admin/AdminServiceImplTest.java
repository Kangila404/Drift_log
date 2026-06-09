package org.example.drift_log.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.admin.application.AdminServiceImpl;
import org.example.drift_log.admin.domain.repository.AppVersionRepository;
import org.example.drift_log.admin.exception.AdminErrorCode;
import org.example.drift_log.admin.exception.AdminException;
import org.example.drift_log.admin.presentation.dto.res.AdminDashboardResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserDetailResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserResponse;
import org.example.drift_log.feedback.domain.model.EndingFeedback;
import org.example.drift_log.feedback.domain.repository.EndingFeedBackRepository;
import org.example.drift_log.user.domain.enums.AuthType;
import org.example.drift_log.user.domain.model.AuthIdentity;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.AuthIdentityRepository;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class AdminServiceImplTest {

    @InjectMocks private AdminServiceImpl adminService;

    @Mock private UserRepository userRepository;
    @Mock private AuthIdentityRepository authIdentityRepository;
    @Mock private EndingFeedBackRepository endingFeedBackRepository;
    @Mock private VoyageStatusRepository voyageStatusRepository;
    @Mock private VoyageLogRepository voyageLogRepository;
    @Mock private AppVersionRepository appVersionRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private User 정지된유저() {
        User user = User.createLocalUser("테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        user.banUser();
        return user;
    }

    private AuthIdentity 로컬인증수단(User user) {
        AuthIdentity identity = AuthIdentity.ofLocal(user, "test@test.com", "encoded");
        ReflectionTestUtils.setField(identity, "id", 100L);
        return identity;
    }

    private VoyageStatus 정박중인_항해상태() {
        return VoyageStatus.builder()
            .userId(1L).voyageState(VoyageState.ANCHORED).isFamilyReunited(false).build();
    }

    private VoyageStatus 스토리클리어한_항해상태() {
        return VoyageStatus.builder()
            .userId(1L).voyageState(VoyageState.ANCHORED).isFamilyReunited(true).build();
    }

    // ================================================================
    // 대시보드 조회
    // ================================================================
    @Nested
    @DisplayName("대시보드조회")
    class 대시보드조회 {

        @Test
        @DisplayName("어드민_대시보드_정상_조회_성공")
        void 어드민_대시보드_정상_조회_성공() {
            given(userRepository.count()).willReturn(100L);
            given(userRepository.countByLastLoginAtAfter(any())).willReturn(10L);
            given(voyageStatusRepository.countClearUser()).willReturn(5L);
            given(endingFeedBackRepository.findAll()).willReturn(List.of());

            AdminDashboardResponse response = adminService.getDashboard();

            assertThat(response).isNotNull();
        }
    }

    // ================================================================
    // 유저 목록 조회
    // ================================================================
    @Nested
    @DisplayName("유저목록조회")
    class 유저목록조회 {

        @Test
        @DisplayName("어드민_유저목록_정상_조회_성공")
        void 어드민_유저목록_정상_조회_성공() {
            User user = 활성유저();
            given(userRepository.findAll()).willReturn(List.of(user));
            given(authIdentityRepository.findFirstByUserId(1L))
                .willReturn(Optional.of(로컬인증수단(user)));

            List<AdminUserResponse> response = adminService.getUserList();

            assertThat(response).isNotNull();
            assertThat(response).hasSize(1);
        }

        @Test
        @DisplayName("어드민_유저목록_비어있을때_빈리스트_반환")
        void 어드민_유저목록_비어있을때_빈리스트_반환() {
            given(userRepository.findAll()).willReturn(List.of());

            List<AdminUserResponse> response = adminService.getUserList();

            assertThat(response).isEmpty();
        }
    }

    // ================================================================
    // 유저 상세 조회
    // ================================================================
    @Nested
    @DisplayName("유저상세조회")
    class 유저상세조회 {

        @Test
        @DisplayName("어드민_유저상세_스토리미클리어_조회_성공")
        void 어드민_유저상세_스토리미클리어_조회_성공() {
            User user = 활성유저();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));
            given(authIdentityRepository.findFirstByUserId(1L)).willReturn(Optional.of(로컬인증수단(user)));
            given(voyageStatusRepository.findByUserId(anyLong())).willReturn(Optional.of(정박중인_항해상태()));
            given(endingFeedBackRepository.findByUserId(anyLong())).willReturn(Optional.empty());
            given(voyageLogRepository.findAllByUserId(anyLong())).willReturn(List.of());

            AdminUserDetailResponse response = adminService.getUserDetail("uuid");

            assertThat(response).isNotNull();
            assertThat(response.isStoryClear()).isFalse();
        }

        @Test
        @DisplayName("어드민_유저상세_스토리클리어_조회_성공")
        void 어드민_유저상세_스토리클리어_조회_성공() {
            User user = 활성유저();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));
            given(authIdentityRepository.findFirstByUserId(1L)).willReturn(Optional.of(로컬인증수단(user)));
            given(voyageStatusRepository.findByUserId(anyLong())).willReturn(Optional.of(스토리클리어한_항해상태()));
            given(endingFeedBackRepository.findByUserId(anyLong())).willReturn(Optional.empty());
            given(voyageLogRepository.findAllByUserId(anyLong())).willReturn(List.of());

            AdminUserDetailResponse response = adminService.getUserDetail("uuid");

            assertThat(response.isStoryClear()).isTrue();
        }

        @Test
        @DisplayName("어드민_유저상세_피드백있을때_조회_성공")
        void 어드민_유저상세_피드백있을때_조회_성공() {
            User user = 활성유저();
            EndingFeedback feedback = EndingFeedback.create("좋았어요", user);
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));
            given(authIdentityRepository.findFirstByUserId(1L)).willReturn(Optional.of(로컬인증수단(user)));
            given(voyageStatusRepository.findByUserId(anyLong())).willReturn(Optional.of(정박중인_항해상태()));
            given(endingFeedBackRepository.findByUserId(anyLong())).willReturn(Optional.of(feedback));
            given(voyageLogRepository.findAllByUserId(anyLong())).willReturn(List.of());

            AdminUserDetailResponse response = adminService.getUserDetail("uuid");

            assertThat(response.endingFeedback()).isEqualTo("좋았어요");
        }

        @Test
        @DisplayName("어드민_유저상세_존재하지않는유저_예외")
        void 어드민_유저상세_존재하지않는유저_예외() {
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminService.getUserDetail("ghost"))
                .isInstanceOf(AdminException.class)
                .satisfies(e -> assertThat(((AdminException) e).getErrorCode())
                    .isEqualTo(AdminErrorCode.ADMIN_USER_NOT_FOUND));
        }

        @Test
        @DisplayName("어드민_유저상세_항해상태없을때_예외")
        void 어드민_유저상세_항해상태없을때_예외() {
            User user = 활성유저();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));
            given(authIdentityRepository.findFirstByUserId(1L)).willReturn(Optional.of(로컬인증수단(user)));
            given(voyageStatusRepository.findByUserId(anyLong())).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminService.getUserDetail("uuid"))
                .isInstanceOf(AdminException.class)
                .satisfies(e -> assertThat(((AdminException) e).getErrorCode())
                    .isEqualTo(AdminErrorCode.VOYAGE_STATUS_NOT_FOUND));
        }
    }

    // ================================================================
    // 유저 정지 / 활성화
    // ================================================================
    @Nested
    @DisplayName("유저정지")
    class 유저정지 {

        @Test
        @DisplayName("어드민_유저정지_성공")
        void 어드민_유저정지_성공() {
            User user = 활성유저();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));

            adminService.banUser("uuid");

            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("어드민_유저정지_존재하지않는유저_예외")
        void 어드민_유저정지_존재하지않는유저_예외() {
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminService.banUser("ghost"))
                .isInstanceOf(AdminException.class)
                .satisfies(e -> assertThat(((AdminException) e).getErrorCode())
                    .isEqualTo(AdminErrorCode.ADMIN_USER_NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("유저활성화")
    class 유저활성화 {

        @Test
        @DisplayName("어드민_유저활성화_성공")
        void 어드민_유저활성화_성공() {
            User user = 정지된유저();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(user));

            adminService.activateUser("uuid");

            verify(userRepository).save(user);
        }

        @Test
        @DisplayName("어드민_유저활성화_존재하지않는유저_예외")
        void 어드민_유저활성화_존재하지않는유저_예외() {
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            assertThatThrownBy(() -> adminService.activateUser("ghost"))
                .isInstanceOf(AdminException.class)
                .satisfies(e -> assertThat(((AdminException) e).getErrorCode())
                    .isEqualTo(AdminErrorCode.ADMIN_USER_NOT_FOUND));
        }
    }
}