package org.example.drift_log.weather;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import java.time.LocalDate;
import java.util.Optional;
import org.example.drift_log.weather.application.WeatherServiceImpl;
import org.example.drift_log.weather.domain.model.Weather;
import org.example.drift_log.weather.domain.port.WeatherApiPort;
import org.example.drift_log.weather.domain.repository.WeatherRepository;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.presentation.dto.res.WeatherRawData;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
public class WeatherServiceImplTest {

    @InjectMocks
    private WeatherServiceImpl weatherService;

    @Mock private WeatherRepository weatherRepository;
    @Mock private WeatherThemeRepository weatherThemeRepository;
    @Mock private WeatherApiPort weatherApiPort;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private Weather 날씨엔티티(Long id) {
        Weather weather = new Weather();
        org.springframework.test.util.ReflectionTestUtils.setField(weather, "id", id);
        return weather;
    }

    // 맑음, 강수없음, 바람약함 → 잔잔한 수면(1L)
    private WeatherRawData 맑은날씨() {
        return new WeatherRawData("맑음", "1", "0", "2.0");
    }

    // 비, 바람약함 → 잔잔한 비(4L)
    private WeatherRawData 비오는날씨() {
        return new WeatherRawData("비", "1", "1", "2.0");
    }

    // 강풍 → 폭풍우(6L)
    private WeatherRawData 폭풍날씨() {
        return new WeatherRawData("강풍", "1", "0", "9.0");
    }

    // ================================================================
    // 오늘 날씨 업데이트
    // ================================================================
    @Nested
    @DisplayName("오늘날씨업데이트")
    class 오늘날씨업데이트 {

        @Test
        @DisplayName("날씨업데이트_맑은날_정상_성공")
        void 날씨업데이트_맑은날_정상_성공() {
            // given
            given(weatherThemeRepository.existsByDate(any(LocalDate.class))).willReturn(false);
            given(weatherApiPort.fetchTodayWeather()).willReturn(맑은날씨());
            given(weatherRepository.findById(anyLong())).willReturn(Optional.of(날씨엔티티(1L)));

            // when
            weatherService.updateTodayWeather();

            // then - WeatherTheme 저장 호출됐는지 검증
            verify(weatherThemeRepository).save(any());
        }

        @Test
        @DisplayName("날씨업데이트_비오는날_정상_성공")
        void 날씨업데이트_비오는날_정상_성공() {
            // given
            given(weatherThemeRepository.existsByDate(any(LocalDate.class))).willReturn(false);
            given(weatherApiPort.fetchTodayWeather()).willReturn(비오는날씨());
            given(weatherRepository.findById(anyLong())).willReturn(Optional.of(날씨엔티티(4L)));

            // when
            weatherService.updateTodayWeather();

            // then
            verify(weatherThemeRepository).save(any());
        }

        @Test
        @DisplayName("날씨업데이트_폭풍날_정상_성공")
        void 날씨업데이트_폭풍날_정상_성공() {
            // given
            given(weatherThemeRepository.existsByDate(any(LocalDate.class))).willReturn(false);
            given(weatherApiPort.fetchTodayWeather()).willReturn(폭풍날씨());
            given(weatherRepository.findById(anyLong())).willReturn(Optional.of(날씨엔티티(6L)));

            // when
            weatherService.updateTodayWeather();

            // then
            verify(weatherThemeRepository).save(any());
        }

        @Test
        @DisplayName("날씨업데이트_오늘날씨이미존재_예외")
        void 날씨업데이트_오늘날씨이미존재_예외() {
            // given - 오늘 날씨가 이미 있음
            given(weatherThemeRepository.existsByDate(any(LocalDate.class))).willReturn(true);

            // when & then
            assertThatThrownBy(() -> weatherService.updateTodayWeather())
                .isInstanceOf(WeatherException.class)
                .satisfies(e -> org.assertj.core.api.Assertions.assertThat(((WeatherException) e).getErrorCode())
                    .isEqualTo(WeatherErrorCode.TODAY_WEATHER_ALREADY_EXISTS));

            // 날씨가 이미 있으면 API 호출도, 저장도 하면 안 됨
            verify(weatherApiPort, never()).fetchTodayWeather();
            verify(weatherThemeRepository, never()).save(any());
        }

        @Test
        @DisplayName("날씨업데이트_날씨데이터없을때_예외")
        void 날씨업데이트_날씨데이터없을때_예외() {
            // given - API는 정상인데 DB에 해당 날씨 id가 없음
            given(weatherThemeRepository.existsByDate(any(LocalDate.class))).willReturn(false);
            given(weatherApiPort.fetchTodayWeather()).willReturn(맑은날씨());
            given(weatherRepository.findById(anyLong())).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> weatherService.updateTodayWeather())
                .isInstanceOf(WeatherException.class)
                .satisfies(e -> org.assertj.core.api.Assertions.assertThat(((WeatherException) e).getErrorCode())
                    .isEqualTo(WeatherErrorCode.WEATHER_NOT_FOUND));

            // 날씨 못 찾았으면 저장도 하면 안 됨
            verify(weatherThemeRepository, never()).save(any());
        }
    }
}
