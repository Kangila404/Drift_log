package org.example.drift_log.customBoat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import java.util.Optional;
import org.example.drift_log.customBoat.application.CustomBoatServiceImpl;
import org.example.drift_log.customBoat.domain.model.CustomBoat;
import org.example.drift_log.customBoat.domain.repository.CustomBoatRepository;
import org.example.drift_log.customBoat.presentation.dto.req.UpdateBoatRequest;
import org.example.drift_log.customBoat.presentation.dto.res.CustomBoatResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class CustomBoatServiceImplTest {

    @InjectMocks
    private CustomBoatServiceImpl customBoatService;

    @Mock
    private CustomBoatRepository customBoatRepository;

    @Mock
    private UserRepository userRepository;

    // ── 공통 픽스처 ────────────────────────────────────────────────
    private User 유저(Long id) {
        User user = User.createLocalUser("테스터");
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private CustomBoat 보트(Long userId, int sail, int body, int lantern) {
        return CustomBoat.builder()
            .userId(userId)
            .sail(sail)
            .body(body)
            .lantern(lantern)
            .build();
    }

    // ================================================================
    // getMyBoat
    // ================================================================
    @Nested
    @DisplayName("내 보트 조회")
    class 내_보트_조회 {

        @Test
        @DisplayName("보트가_존재하면_해당_보트를_반환한다")
        void 보트가_존재하면_해당_보트를_반환한다() {
            // given
            User user = 유저(1L);
            CustomBoat boat = 보트(1L, 2, 3, 4);
            given(userRepository.findByUserId("user-id-1")).willReturn(Optional.of(user));
            given(customBoatRepository.findByUserId(1L)).willReturn(Optional.of(boat));

            // when
            CustomBoatResponse response = customBoatService.getMyBoat("user-id-1");

            // then
            assertThat(response.sail()).isEqualTo(2);
            assertThat(response.body()).isEqualTo(3);
            assertThat(response.lantern()).isEqualTo(4);
        }

        @Test
        @DisplayName("보트가_없으면_기본값_보트를_반환한다")
        void 보트가_없으면_기본값_보트를_반환한다() {
            // given
            User user = 유저(1L);
            given(userRepository.findByUserId("user-id-1")).willReturn(Optional.of(user));
            given(customBoatRepository.findByUserId(1L)).willReturn(Optional.empty());

            // when
            CustomBoatResponse response = customBoatService.getMyBoat("user-id-1");

            // then
            assertThat(response.sail()).isEqualTo(0);
            assertThat(response.body()).isEqualTo(0);
            assertThat(response.lantern()).isEqualTo(0);
        }

        @Test
        @DisplayName("유저가_존재하지_않으면_예외를_던진다")
        void 유저가_존재하지_않으면_예외를_던진다() {
            // given
            given(userRepository.findByUserId("unknown")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> customBoatService.getMyBoat("unknown"))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND));
        }
    }

    // ================================================================
    // updateBoat
    // ================================================================
    @Nested
    @DisplayName("보트 색상 변경")
    class 보트_색상_변경 {

        @Test
        @DisplayName("보트가_존재하면_색상을_변경한다")
        void 보트가_존재하면_색상을_변경한다() {
            // given
            User user = 유저(1L);
            CustomBoat boat = 보트(1L, 0, 0, 0);
            UpdateBoatRequest request = new UpdateBoatRequest(5, 10, 15);

            given(userRepository.findByUserId("user-id-1")).willReturn(Optional.of(user));
            given(customBoatRepository.findByUserId(1L)).willReturn(Optional.of(boat));

            // when
            customBoatService.updateBoat("user-id-1", request);

            // then
            assertThat(boat.getSail()).isEqualTo(5);
            assertThat(boat.getBody()).isEqualTo(10);
            assertThat(boat.getLantern()).isEqualTo(15);
        }

        @Test
        @DisplayName("보트가_없으면_기본_보트에_색상을_적용한다")
        void 보트가_없으면_기본_보트에_색상을_적용한다() {
            // given
            User user = 유저(1L);
            UpdateBoatRequest request = new UpdateBoatRequest(1, 2, 3);

            given(userRepository.findByUserId("user-id-1")).willReturn(Optional.of(user));
            given(customBoatRepository.findByUserId(1L)).willReturn(Optional.empty());

            // when & then: 예외 없이 기본 보트 생성 후 색상 적용
            customBoatService.updateBoat("user-id-1", request);
        }

        @Test
        @DisplayName("유저가_존재하지_않으면_예외를_던진다")
        void 유저가_존재하지_않으면_예외를_던진다() {
            // given
            given(userRepository.findByUserId("unknown")).willReturn(Optional.empty());
            UpdateBoatRequest request = new UpdateBoatRequest(1, 2, 3);

            // when & then
            assertThatThrownBy(() -> customBoatService.updateBoat("unknown", request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND));
        }
    }
}