package org.example.drift_log.voyage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.model.CityRoute;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.city.domain.repository.CityRouteRepository;
import org.example.drift_log.randomEvent.domain.repository.RandomEventRepository;
import org.example.drift_log.randomEvent.domain.repository.VoyageEventRepository;
import org.example.drift_log.trace.domain.repository.DiscoveredTraceRepository;
import org.example.drift_log.trace.domain.repository.TraceRepository;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.application.VoyageServiceImpl;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
import org.example.drift_log.voyage.domain.repository.VoyageLogRepository;
import org.example.drift_log.voyage.domain.repository.VoyageStatusRepository;
import org.example.drift_log.voyage.exception.VoyageErrorCode;
import org.example.drift_log.voyage.exception.VoyageException;
import org.example.drift_log.voyage.presentation.dto.req.VoyageCompleteRequest;
import org.example.drift_log.voyage.presentation.dto.req.VoyageStartRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageCompleteResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStartResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStatusResponse;
import org.example.drift_log.voyage.presentation.dto.res.VoyageStopResponse;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class VoyageServiceImplTest {

    @InjectMocks private VoyageServiceImpl voyageService;

    @Mock private UserRepository userRepository;
    @Mock private VoyageStatusRepository voyageStatusRepository;
    @Mock private CityRouteRepository cityRouteRepository;
    @Mock private VoyageLogRepository voyageLogRepository;
    @Mock private TraceRepository traceRepository;
    @Mock private DiscoveredTraceRepository discoveredTraceRepository;
    @Mock private CityRepository cityRepository;
    @Mock private WeatherThemeRepository weatherThemeRepository;
    @Mock private RandomEventRepository randomEventRepository;
    @Mock private VoyageEventRepository voyageEventRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        ReflectionTestUtils.setField(user, "userId", "uuid");
        return user;
    }

    private City 서울() {
        return new City(1L, "서울", "잠긴 서울", "seoul.png", "seoul.mp3", true);
    }

    private City 인천() {
        return new City(2L, "인천", "인천 설명", "incheon.png", "incheon.mp3", false);
    }

    private VoyageStatus 정박상태() {
        return VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(1L)
            .progress(0f)
            .build();
    }

    private VoyageStatus 항해중상태() {
        VoyageStatus status = VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.SAILING)
            .departedCityId(1L)
            .destinationCityId(2L)
            .progress(0.5f)
            .build();
        ReflectionTestUtils.setField(status, "lastTickedAt", LocalDateTime.now().minusSeconds(5));
        return status;
    }

    private VoyageStatus 일시정지상태() {
        return VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.PAUSED)
            .departedCityId(1L)
            .destinationCityId(2L)
            .progress(0.3f)
            .build();
    }

    private VoyageStatus 도착완료상태() {
        return VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(2L)
            .departedCityId(1L)
            .progress(0f)
            .build();
    }

    private CityRoute 서울_인천_경로() {
        return CityRoute.builder()
            .fromCityId(1L)
            .toCityId(2L)
            .durationMinutes(60)
            .build();
    }

    // ================================================================
    // 항해 상태 조회
    // ================================================================
    @Nested
    @DisplayName("항해상태조회")
    class 항해상태조회 {

        @Test
        @DisplayName("항해상태_정박중_조회_성공")
        void 항해상태_정박중_조회_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(정박상태()));

            VoyageStatusResponse response = voyageService.getVoyageStatus("uuid");

            assertThat(response).isNotNull();
            assertThat(response.voyageState()).isEqualTo(VoyageState.ANCHORED);
        }

        @Test
        @DisplayName("항해상태_항해중_조회_성공")
        void 항해상태_항해중_조회_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(항해중상태()));
            given(cityRouteRepository.findByFromCityIdAndToCityId(1L, 2L))
                .willReturn(Optional.of(서울_인천_경로()));

            VoyageStatusResponse response = voyageService.getVoyageStatus("uuid");

            assertThat(response).isNotNull();
            assertThat(response.voyageState()).isEqualTo(VoyageState.SAILING);
        }

        @Test
        @DisplayName("항해상태_진척도100퍼센트_도착처리")
        void 항해상태_진척도100퍼센트_도착처리() {
            // lastTickedAt = null → tickProgress가 lastTickedAt만 세팅 후 리턴 → progress 그대로 1.0f
            VoyageStatus 도착직전 = VoyageStatus.builder()
                .userId(1L)
                .voyageState(VoyageState.SAILING)
                .departedCityId(1L)
                .destinationCityId(2L)
                .progress(1.0f)
                .build();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(도착직전));
            given(cityRouteRepository.findByFromCityIdAndToCityId(1L, 2L))
                .willReturn(Optional.of(서울_인천_경로()));

            VoyageStatusResponse response = voyageService.getVoyageStatus("uuid");

            assertThat(response.voyageState()).isEqualTo(VoyageState.ANCHORED);
        }

        @Test
        @DisplayName("항해상태_존재하지않는유저_예외")
        void 항해상태_존재하지않는유저_예외() {
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            assertThatThrownBy(() -> voyageService.getVoyageStatus("ghost"))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.USER_NOT_FOUND));
        }
    }

    // ================================================================
    // 항해 시작
    // ================================================================
    @Nested
    @DisplayName("항해시작")
    class 항해시작 {

        @Test
        @DisplayName("항해시작_정상_성공")
        void 항해시작_정상_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(정박상태()));
            given(cityRepository.existsById(2L)).willReturn(true);

            VoyageStartResponse response = voyageService.voyageStart("uuid", new VoyageStartRequest(2L));

            assertThat(response).isNotNull();
            verify(voyageStatusRepository).save(any(VoyageStatus.class));
        }

        @Test
        @DisplayName("항해시작_정박중이_아닐때_예외")
        void 항해시작_정박중이_아닐때_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(항해중상태()));

            assertThatThrownBy(() -> voyageService.voyageStart("uuid", new VoyageStartRequest(2L)))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.NOT_ANCHORED));
        }

        @Test
        @DisplayName("항해시작_존재하지않는_도시_예외")
        void 항해시작_존재하지않는_도시_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(정박상태()));
            given(cityRepository.existsById(99L)).willReturn(false);

            assertThatThrownBy(() -> voyageService.voyageStart("uuid", new VoyageStartRequest(99L)))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.CITY_INVALID));
        }

        @Test
        @DisplayName("항해시작_같은도시_예외")
        void 항해시작_같은도시_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(정박상태()));
            given(cityRepository.existsById(1L)).willReturn(true);

            assertThatThrownBy(() -> voyageService.voyageStart("uuid", new VoyageStartRequest(1L)))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.SAME_CITY));
        }
    }

    // ================================================================
    // 항해 일시정지
    // ================================================================
    @Nested
    @DisplayName("항해일시정지")
    class 항해일시정지 {

        @Test
        @DisplayName("항해일시정지_항해중_성공")
        void 항해일시정지_항해중_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(항해중상태()));

            VoyageStopResponse response = voyageService.voyageStop("uuid");

            assertThat(response).isNotNull();
            verify(voyageStatusRepository).save(any(VoyageStatus.class));
        }

        @Test
        @DisplayName("항해일시정지_항해중이_아닐때_예외")
        void 항해일시정지_항해중이_아닐때_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(정박상태()));

            assertThatThrownBy(() -> voyageService.voyageStop("uuid"))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.NOT_SAILING));
        }
    }

    // ================================================================
    // 항해 재개
    // ================================================================
    @Nested
    @DisplayName("항해재개")
    class 항해재개 {

        @Test
        @DisplayName("항해재개_일시정지중_성공")
        void 항해재개_일시정지중_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(일시정지상태()));

            assertThat(voyageService.voyageResume("uuid")).isNotNull();
            verify(voyageStatusRepository).save(any(VoyageStatus.class));
        }

        @Test
        @DisplayName("항해재개_일시정지_아닐때_예외")
        void 항해재개_일시정지_아닐때_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(항해중상태()));

            assertThatThrownBy(() -> voyageService.voyageResume("uuid"))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.NOT_PAUSED));
        }
    }

    // ================================================================
    // 항해 완료
    // ================================================================
    @Nested
    @DisplayName("항해완료")
    class 항해완료 {

        @Test
        @DisplayName("항해완료_정상_성공_첫방문")
        void 항해완료_정상_성공_첫방문() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(도착완료상태()));
            given(cityRepository.findById(2L)).willReturn(Optional.of(인천()));
            given(cityRepository.findById(1L)).willReturn(Optional.of(서울()));
            given(voyageLogRepository.countByUserIdAndToCityId(anyLong(), anyLong())).willReturn(0L);
            given(weatherThemeRepository.findByDate(any(LocalDate.class))).willReturn(Optional.empty());
            given(traceRepository.findByCityId(2L)).willReturn(Optional.empty());


            VoyageCompleteResponse response = voyageService.voyageComplete("uuid",
                new VoyageCompleteRequest(List.of()));

            assertThat(response).isNotNull();
            assertThat(response.arrivedCity().cityId()).isEqualTo(2L);
            assertThat(response.isFirstVisit()).isTrue();
            assertThat(response.isEnding()).isFalse();
            verify(voyageStatusRepository).save(any(VoyageStatus.class));
        }

        @Test
        @DisplayName("항해완료_재방문_성공")
        void 항해완료_재방문_성공() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(도착완료상태()));
            given(cityRepository.findById(2L)).willReturn(Optional.of(인천()));
            given(cityRepository.findById(1L)).willReturn(Optional.of(서울()));
            given(voyageLogRepository.countByUserIdAndToCityId(anyLong(), anyLong())).willReturn(1L);
            given(weatherThemeRepository.findByDate(any(LocalDate.class))).willReturn(Optional.empty());
            given(traceRepository.findByCityId(2L)).willReturn(Optional.empty());


            VoyageCompleteResponse response = voyageService.voyageComplete("uuid",
                new VoyageCompleteRequest(List.of()));

            assertThat(response.isFirstVisit()).isFalse();
        }

        @Test
        @DisplayName("항해완료_멱등가드_이미완료시_현재도시반환")
        void 항해완료_멱등가드_이미완료시_현재도시반환() {
            // departedCityId == null → 이미 complete 처리된 상태
            VoyageStatus 이미완료 = VoyageStatus.builder()
                .userId(1L)
                .voyageState(VoyageState.ANCHORED)
                .currentCityId(2L)
                .progress(0f)
                .build();
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(이미완료));
            given(cityRepository.findById(2L)).willReturn(Optional.of(인천()));

            VoyageCompleteResponse response = voyageService.voyageComplete("uuid",
                new VoyageCompleteRequest(List.of()));

            assertThat(response.arrivedCity().cityId()).isEqualTo(2L);
            assertThat(response.voyageLog()).isNull();
        }

        @Test
        @DisplayName("항해완료_도착상태_아닐때_예외")
        void 항해완료_도착상태_아닐때_예외() {
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(1L)).willReturn(Optional.of(항해중상태()));

            assertThatThrownBy(() -> voyageService.voyageComplete("uuid",
                new VoyageCompleteRequest(List.of())))
                .isInstanceOf(VoyageException.class)
                .satisfies(e -> assertThat(((VoyageException) e).getErrorCode())
                    .isEqualTo(VoyageErrorCode.NOT_ARRIVED));
        }
    }
}