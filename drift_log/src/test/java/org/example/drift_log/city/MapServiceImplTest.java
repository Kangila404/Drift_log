package org.example.drift_log.city;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.city.application.MapServiceImpl;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.model.CityRoute;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.example.drift_log.city.domain.repository.CityRouteRepository;
import org.example.drift_log.city.exception.CityErrorCode;
import org.example.drift_log.city.exception.CityException;
import org.example.drift_log.city.presentation.dto.res.MapResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.voyage.domain.entity.VoyageStatus;
import org.example.drift_log.voyage.domain.enums.VoyageState;
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
public class MapServiceImplTest {

    @InjectMocks private MapServiceImpl mapService;

    @Mock private CityRepository cityRepository;
    @Mock private UserRepository userRepository;
    @Mock private VoyageStatusRepository voyageStatusRepository;
    @Mock private CityRouteRepository cityRouteRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    private City 도시(Long id, String name) {
        // @AllArgsConstructor: (id, name, description, imgUrl, bgmUrl, isStartCity)
        return new City(id, name, name + " 설명", name + ".png", name + ".mp3", id == 1L);
    }

    private List<City> 전체도시목록() {
        return List.of(도시(1L, "서울"), 도시(2L, "인천"), 도시(3L, "부산"));
    }

    private VoyageStatus 정박중인_상태(Long currentCityId) {
        return VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.ANCHORED)
            .currentCityId(currentCityId)
            .isFamilyReunited(false)
            .progress(0f)
            .build();
    }

    private CityRoute 도시경로(Long fromCityId, Long toCityId) {
        return CityRoute.builder()
            .fromCityId(fromCityId)
            .toCityId(toCityId)
            .durationMinutes(60)
            .build();
    }

    private VoyageStatus 항해중인_상태(Long departedCityId, Long destinationCityId) {
        return VoyageStatus.builder()
            .userId(1L)
            .voyageState(VoyageState.SAILING)
            .departedCityId(departedCityId)
            .destinationCityId(destinationCityId)
            .currentCityId(departedCityId)
            .isFamilyReunited(false)
            .progress(0.5f)
            .build();
    }

    // ================================================================
    // 지도 조회
    // ================================================================
    @Nested
    @DisplayName("지도조회")
    class 지도조회 {

        @Test
        @DisplayName("정박중_지도조회_성공")
        void 정박중_지도조회_성공() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(정박중인_상태(1L)));
            given(cityRepository.findAll()).willReturn(전체도시목록());
            given(cityRepository.findById(1L)).willReturn(Optional.of(도시(1L, "서울")));

            // when
            MapResponse response = mapService.getMap("uuid");

            // then
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("항해중_지도조회_성공")
        void 항해중_지도조회_성공() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(항해중인_상태(1L, 2L)));
            given(cityRepository.findAll()).willReturn(전체도시목록());
            given(cityRepository.findById(1L)).willReturn(Optional.of(도시(1L, "서울")));
            given(cityRepository.findById(2L)).willReturn(Optional.of(도시(2L, "인천")));
            given(cityRouteRepository.findByFromCityIdAndToCityId(anyLong(), anyLong()))
                .willReturn(Optional.of(도시경로(1L, 2L)));

            // when
            MapResponse response = mapService.getMap("uuid");

            // then
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("지도조회_존재하지않는유저_예외")
        void 지도조회_존재하지않는유저_예외() {
            // given
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> mapService.getMap("ghost"))
                .isInstanceOf(CityException.class)
                .satisfies(e -> assertThat(((CityException) e).getErrorCode())
                    .isEqualTo(CityErrorCode.USER_NOT_FOUND));
        }

        @Test
        @DisplayName("지도조회_항해상태없을때_예외")
        void 지도조회_항해상태없을때_예외() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(anyLong())).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> mapService.getMap("uuid"))
                .isInstanceOf(CityException.class)
                .satisfies(e -> assertThat(((CityException) e).getErrorCode())
                    .isEqualTo(CityErrorCode.VOYAGE_STATUS_NOT_FOUND));
        }

        @Test
        @DisplayName("정박중_현재도시없을때_예외")
        void 정박중_현재도시없을때_예외() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(정박중인_상태(999L)));
            given(cityRepository.findAll()).willReturn(전체도시목록());
            given(cityRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> mapService.getMap("uuid"))
                .isInstanceOf(CityException.class)
                .satisfies(e -> assertThat(((CityException) e).getErrorCode())
                    .isEqualTo(CityErrorCode.CITY_NOT_FOUND));
        }

        @Test
        @DisplayName("항해중_목적지도시없을때_예외")
        void 항해중_목적지도시없을때_예외() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(voyageStatusRepository.findByUserId(anyLong()))
                .willReturn(Optional.of(항해중인_상태(1L, 999L)));
            given(cityRepository.findAll()).willReturn(전체도시목록());
            given(cityRepository.findById(1L)).willReturn(Optional.of(도시(1L, "서울")));
            given(cityRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> mapService.getMap("uuid"))
                .isInstanceOf(CityException.class)
                .satisfies(e -> assertThat(((CityException) e).getErrorCode())
                    .isEqualTo(CityErrorCode.CITY_NOT_FOUND));
        }
    }
}