package org.example.drift_log.voyage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.application.VoyageLogServiceImpl;
import org.example.drift_log.voyage.domain.entity.VoyageLog;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.exception.VoyageErrorCode;
import org.example.drift_log.voyage.exception.VoyageException;
import org.example.drift_log.voyage.presentation.dto.req.WriteVoyageLogRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageLogResponse;
import org.example.drift_log.voyage.presentation.dto.res.WriteVoyageLogResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class VoyageLogServiceImplTest {

    @InjectMocks private VoyageLogServiceImpl voyageLogService;

    @Mock private VoyageLogRepository voyageLogRepository;
    @Mock private UserRepository userRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저(String userId) {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }

    private VoyageLog 항해로그(Long userId) {
        VoyageLog log = VoyageLog.builder()
            .userId(userId)
            .fromCity(new City(1L, "서울", "잠긴 서울", "seoul.png", "seoul.mp3", true))
            .toCity(new City(2L, "인천", "인천 설명", "incheon.png", "incheon.mp3", false))
            .autoText("서울을(를) 떠나 인천에 도착했다.")
            .weatherTheme("잔잔한 수면")
            .build();
        ReflectionTestUtils.setField(log, "id", 1L);
        return log;
    }

    // ================================================================
    // 항해 일지 목록 조회
    // ================================================================
    @Nested
    @DisplayName("항해일지목록조회")
    class 항해일지목록조회 {

        @Test
        @DisplayName("항해일지_기록없을때_빈리스트_반환")
        void 항해일지_기록없을때_빈리스트_반환() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저("uuid")));
            given(voyageLogRepository.findAllByUserId(anyLong())).willReturn(List.of());

            // when
            List<VoyageLogResponse> response = voyageLogService.getLogList("uuid");

            // then
            assertThat(response).isEmpty();
        }

        @Test
        @DisplayName("항해일지_기록있을때_목록_반환")
        void 항해일지_기록있을때_목록_반환() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저("uuid")));
            given(voyageLogRepository.findAllByUserId(anyLong())).willReturn(List.of(항해로그(1L)));

            // when
            List<VoyageLogResponse> response = voyageLogService.getLogList("uuid");

            // then
            assertThat(response).hasSize(1);
        }

        @Test
        @DisplayName("항해일지_존재하지않는유저_예외")
        void 항해일지_존재하지않는유저_예외() {
            // given
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> voyageLogService.getLogList("ghost"))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.USER_NOT_FOUND));
        }
    }

    // ================================================================
    // 항해 일지 작성
    // ================================================================
    @Nested
    @DisplayName("항해일지작성")
    class 항해일지작성 {

        @Test
        @DisplayName("항해일지_본인로그_작성_성공")
        void 항해일지_본인로그_작성_성공() {
            // given
            User user = 활성유저("my-uuid");
            VoyageLog log = 항해로그(1L); // userId = 1L

            given(voyageLogRepository.findById(1L)).willReturn(Optional.of(log));
            given(userRepository.findById(1L)).willReturn(Optional.of(user));

            // when
            WriteVoyageLogResponse response = voyageLogService.writeLog(
                "my-uuid", 1L, new WriteVoyageLogRequest("오늘은 잔잔했다.")
            );

            // then
            assertThat(response).isNotNull();
            verify(voyageLogRepository).save(log);
        }

        @Test
        @DisplayName("항해일지_다른사람_로그_작성_예외")
        void 항해일지_다른사람_로그_작성_예외() {
            // given - 로그는 "owner-uuid" 꺼인데 "other-uuid"가 쓰려고 함
            User owner = 활성유저("owner-uuid");
            VoyageLog log = 항해로그(1L);

            given(voyageLogRepository.findById(1L)).willReturn(Optional.of(log));
            given(userRepository.findById(1L)).willReturn(Optional.of(owner));

            // when & then
            assertThatThrownBy(() -> voyageLogService.writeLog(
                "other-uuid", 1L, new WriteVoyageLogRequest("내용")))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.VOYAGE_LOG_NOT_OWNER));
        }

        @Test
        @DisplayName("항해일지_존재하지않는_로그ID_예외")
        void 항해일지_존재하지않는_로그ID_예외() {
            // given
            given(voyageLogRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> voyageLogService.writeLog(
                "uuid", 999L, new WriteVoyageLogRequest("내용")))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.VOYAGE_LOG_NOT_FOUND));
        }
    }
}