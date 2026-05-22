package org.example.drift_log.randomEvent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import java.util.Optional;
import org.example.drift_log.randomEvent.application.RandomEventServiceImpl;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;
import org.example.drift_log.randomEvent.domain.repository.RandomEventRepository;
import org.example.drift_log.randomEvent.exception.RandomEventErrorCode;
import org.example.drift_log.randomEvent.exception.RandomEventException;
import org.example.drift_log.randomEvent.presentation.dto.res.RandomEventResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class RandomEventServiceImplTest {

    @InjectMocks private RandomEventServiceImpl randomEventService;

    @Mock private RandomEventRepository randomEventRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private RandomEvent 랜덤이벤트() {
        return RandomEvent.builder()
            .id(1L)
            .name("고래 그림자")
            .text("멀리서 고래가 보였다.")
            .cooldownMinutes(30)
            .build();
    }

    // ================================================================
    // 랜덤 이벤트 조회
    // ================================================================
    @Nested
    @DisplayName("랜덤이벤트조회")
    class 랜덤이벤트조회 {

        @Test
        @DisplayName("랜덤이벤트_정상_조회_성공")
        void 랜덤이벤트_정상_조회_성공() {
            // given
            given(randomEventRepository.findRandom()).willReturn(Optional.of(랜덤이벤트()));

            // when
            RandomEventResponse response = randomEventService.getRandomEvent();

            // then
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("랜덤이벤트_이벤트없을때_예외")
        void 랜덤이벤트_이벤트없을때_예외() {
            // given - DB에 이벤트가 하나도 없는 경우
            given(randomEventRepository.findRandom()).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> randomEventService.getRandomEvent())
                .isInstanceOf(RandomEventException.class)
                .satisfies(e -> assertThat(((RandomEventException) e).getErrorCode())
                    .isEqualTo(RandomEventErrorCode.EVENT_NOT_FOUND));
        }
    }
}