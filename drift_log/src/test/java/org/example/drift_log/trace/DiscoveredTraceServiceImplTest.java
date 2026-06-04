package org.example.drift_log.trace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

import java.lang.reflect.Constructor;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.trace.application.DiscoveredTraceServiceImpl;
import org.example.drift_log.trace.domain.enums.FamilyMember;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.exception.TraceErrorCode;
import org.example.drift_log.trace.exception.TraceException;
import org.example.drift_log.trace.presentation.dto.res.DiscoveredTraceResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;


@ExtendWith(MockitoExtension.class)
public class DiscoveredTraceServiceImplTest {

    @InjectMocks private DiscoveredTraceServiceImpl discoveredTraceService;

    @Mock private UserRepository userRepository;
    @Mock private DiscoveredTraceRepository discoveredTraceRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private City 서울() {
        // @AllArgsConstructor: (id, name, description, imgUrl, bgmUrl, isStartCity)
        return new City(1L, "서울", "잠긴 서울", "seoul.png", "seoul.mp3", true);
    }

    private Trace 흔적() {
        try {
            Constructor<Trace> constructor = Trace.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            Trace trace = constructor.newInstance();
            ReflectionTestUtils.setField(trace, "id", 1L);
            ReflectionTestUtils.setField(trace, "cityId", 1L);
            ReflectionTestUtils.setField(trace, "name", "낡은 편지");
            ReflectionTestUtils.setField(trace, "content", "아빠가 남긴 편지");
            ReflectionTestUtils.setField(trace, "familyMember", FamilyMember.DAD); // ← 추가
            ReflectionTestUtils.setField(trace, "imageUrl", "/trace/seoul_dad.png"); // ← 추가
            return trace;
        } catch (Exception e) {
            throw new RuntimeException("Trace 생성 실패", e);
        }
    }

    private DiscoveredTrace 발견한_흔적() {
        return DiscoveredTrace.builder()
            .userId(1L)
            .trace(흔적())
            .city(서울())
            .discoveredAt(LocalDateTime.now())
            .build();
    }

    // ================================================================
    // 발견한 흔적 목록 조회
    // ================================================================
    @Nested
    @DisplayName("흔적목록조회")
    class 흔적목록조회 {

        @Test
        @DisplayName("흔적_발견한것없을때_빈리스트_반환")
        void 흔적_발견한것없을때_빈리스트_반환() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(discoveredTraceRepository.findAllByUserId(anyLong())).willReturn(List.of());

            // when
            List<DiscoveredTraceResponse> response = discoveredTraceService.getDiscoveredTrace("uuid");

            // then
            assertThat(response).isEmpty();
        }

        @Test
        @DisplayName("흔적_발견한것있을때_목록_반환")
        void 흔적_발견한것있을때_목록_반환() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(discoveredTraceRepository.findAllByUserId(anyLong()))
                .willReturn(List.of(발견한_흔적()));

            // when
            List<DiscoveredTraceResponse> response = discoveredTraceService.getDiscoveredTrace("uuid");

            // then
            assertThat(response).hasSize(1);
        }

        @Test
        @DisplayName("흔적_존재하지않는유저_예외")
        void 흔적_존재하지않는유저_예외() {
            // given
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> discoveredTraceService.getDiscoveredTrace("ghost"))
                .isInstanceOf(TraceException.class)
                .satisfies(e -> assertThat(((TraceException) e).getErrorCode())
                    .isEqualTo(TraceErrorCode.USER_NOT_FOUND));
        }
    }
}