package org.example.drift_log.weather;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.infrastructure.external.WeatherApiClient;
import org.example.drift_log.weather.presentation.dto.res.WeatherRawData;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class WeatherApiClientParsingTest {

    private final WeatherApiClient weatherApiClient = new WeatherApiClient();

    @Test
    @DisplayName("기상청 APIHub 인증 실패 응답은 날씨 기본값으로 처리하지 않는다")
    void rejectsApiHubErrorResponse() {
        String response = """
            {
              "result": {
                "status": 401,
                "message": "유효한 인증키가 아닙니다."
              }
            }
            """;

        assertThatThrownBy(() -> parse(response, "20260827"))
            .isInstanceOf(WeatherException.class)
            .satisfies(e -> assertThat(((WeatherException) e).getErrorCode())
                .isEqualTo(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID));
    }

    @Test
    @DisplayName("정상 응답에서 12시 SKY, PTY, WSD 값을 추출한다")
    void parsesNoonForecastItems() {
        String response = """
            {
              "response": {
                "header": {
                  "resultCode": "00",
                  "resultMsg": "NORMAL_SERVICE"
                },
                "body": {
                  "items": {
                    "item": [
                      { "fcstDate": "20260827", "fcstTime": "1200", "category": "SKY", "fcstValue": "3" },
                      { "fcstDate": "20260827", "fcstTime": "1200", "category": "PTY", "fcstValue": "1" },
                      { "fcstDate": "20260827", "fcstTime": "1200", "category": "WSD", "fcstValue": "2.0" }
                    ]
                  }
                }
              }
            }
            """;

        WeatherRawData raw = parse(response, "20260827");

        assertThat(raw.sky()).isEqualTo("3");
        assertThat(raw.pty()).isEqualTo("1");
        assertThat(raw.wsd()).isEqualTo("2.0");
    }

    @Test
    @DisplayName("필수 예보 항목이 없으면 기본 맑음으로 처리하지 않는다")
    void rejectsMissingForecastItems() {
        String response = """
            {
              "response": {
                "header": { "resultCode": "00" },
                "body": {
                  "items": {
                    "item": [
                      { "fcstDate": "20260827", "fcstTime": "1200", "category": "SKY", "fcstValue": "1" }
                    ]
                  }
                }
              }
            }
            """;

        assertThatThrownBy(() -> parse(response, "20260827"))
            .isInstanceOf(WeatherException.class)
            .satisfies(e -> assertThat(((WeatherException) e).getErrorCode())
                .isEqualTo(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID));
    }

    private WeatherRawData parse(String response, String baseDate) {
        return ReflectionTestUtils.invokeMethod(weatherApiClient, "parseWeather", response, baseDate);
    }
}
