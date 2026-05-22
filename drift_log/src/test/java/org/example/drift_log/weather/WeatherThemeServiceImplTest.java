package org.example.drift_log.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.time.LocalDate;
import java.util.Optional;
import org.example.drift_log.weather.application.WeatherThemeServiceImpl;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.presentation.dto.res.TodayWeatherResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class WeatherThemeServiceImplTest {

    @InjectMocks
    private WeatherThemeServiceImpl weatherThemeService;

    @Mock
    private WeatherThemeRepository weatherThemeRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private WeatherTheme 오늘날씨테마() {
        WeatherTheme theme = new WeatherTheme();
        ReflectionTestUtils.setField(theme, "date", LocalDate.now());
        ReflectionTestUtils.setField(theme, "realWeather", "맑음");
        ReflectionTestUtils.setField(theme, "isAbnormal", false);
        return theme;
    }

    // ================================================================
    // 오늘 날씨 테마 조회
    // ================================================================
    @Nested
    @DisplayName("오늘날씨테마조회")
    class 오늘날씨테마조회 {

        @Test
        @DisplayName("오늘날씨_정상_조회_성공")
        void 오늘날씨_정상_조회_성공() {
            // given
            given(weatherThemeRepository.findByDate(any(LocalDate.class)))
                .willReturn(Optional.of(오늘날씨테마()));

            // when
            TodayWeatherResponse response = weatherThemeService.getTodayWeather();

            // then
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("오늘날씨_날씨테마없을때_예외")
        void 오늘날씨_날씨테마없을때_예외() {
            // given - 오늘 날씨가 아직 생성 안 됨 (스케줄러가 아직 안 돌았거나)
            given(weatherThemeRepository.findByDate(any(LocalDate.class)))
                .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> weatherThemeService.getTodayWeather())
                .isInstanceOf(WeatherException.class)
                .satisfies(e -> assertThat(((WeatherException) e).getErrorCode())
                    .isEqualTo(WeatherErrorCode.TODAY_WEATHER_THEME_NOT_FOUND));
        }
    }
}