package org.example.drift_log.weather;

import static org.assertj.core.api.Assertions.assertThat;

import org.example.drift_log.weather.application.WeatherServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WeatherMappingConsistencyTest {

    private final WeatherServiceImpl weatherService = new WeatherServiceImpl(null, null, null);

    @Test
    @DisplayName("강수 없음: 하늘 상태가 인게임 날씨로 매핑된다")
    void mapsSkyWhenThereIsNoPrecipitation() {
        assertThat(convert("1", "0", "2.0")).isEqualTo(1L);
        assertThat(convert("3", "0", "2.0")).isEqualTo(2L);
        assertThat(convert("4", "0", "2.0")).isEqualTo(3L);
    }

    @Test
    @DisplayName("비: 약한 바람이면 비 테마로 매핑된다")
    void mapsRainToRainThemeWhenWindIsWeak() {
        assertThat(convert("1", "1", "2.0")).isEqualTo(4L);
        assertThat(convert("3", "2", "2.0")).isEqualTo(4L);
    }

    @Test
    @DisplayName("강수와 바람: 바람이 강하면 강수보다 바람 테마가 우선된다")
    void windOverridesRainThemeWhenWindIsStrong() {
        assertThat(convert("1", "1", "4.0")).isEqualTo(5L);
        assertThat(convert("1", "1", "8.0")).isEqualTo(6L);
    }

    @Test
    @DisplayName("눈/소나기: 현재 로직에서는 거친 날씨 계열로 매핑된다")
    void mapsSnowAndShowerToRoughWeatherThemes() {
        assertThat(convert("1", "3", "2.0")).isEqualTo(6L);
        assertThat(convert("1", "4", "2.0")).isEqualTo(5L);
    }

    private Long convert(String sky, String pty, String wsd) {
        return ReflectionTestUtils.invokeMethod(weatherService, "convertToInGameWeather", sky, pty, wsd);
    }
}
