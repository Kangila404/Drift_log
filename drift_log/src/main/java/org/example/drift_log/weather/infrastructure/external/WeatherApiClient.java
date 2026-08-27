package org.example.drift_log.weather.infrastructure.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.drift_log.weather.domain.port.WeatherApiPort;
import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.presentation.dto.res.WeatherRawData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeatherApiClient implements WeatherApiPort {

    @Value("${spring.weather.api.key}")
    private String authKey;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public WeatherRawData fetchTodayWeather() {
        String baseDate = LocalDate.now(ZoneId.of("Asia/Seoul"))
            .format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        String response = restClient.get()
            .uri("https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst"
                + "?pageNo=1&numOfRows=1000&dataType=JSON"
                + "&base_date=" + baseDate
                + "&base_time=0500"
                + "&nx=60&ny=127"
                + "&authKey=" + authKey)
            .retrieve()
            .body(String.class);

        return parseWeather(response, baseDate);
    }

    private WeatherRawData parseWeather(String response, String baseDate) {
        try {
            JsonNode root = objectMapper.readTree(response);
            validateApiResponse(root);

            JsonNode items = root.path("response").path("body").path("items").path("item");
            if (!items.isArray()) {
                throw new WeatherException(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID);
            }

            String sky = null;
            String pty = null;
            String wsd = null;

            for (JsonNode item : items) {
                if (!item.path("fcstDate").asText().equals(baseDate)) {
                    continue;
                }
                if (!item.path("fcstTime").asText().equals("1200")) {
                    continue;
                }

                String category = item.path("category").asText();
                if (category.equals("SKY")) {
                    sky = item.path("fcstValue").asText();
                }
                if (category.equals("PTY")) {
                    pty = item.path("fcstValue").asText();
                }
                if (category.equals("WSD")) {
                    wsd = item.path("fcstValue").asText();
                }
            }

            if (sky == null || pty == null || wsd == null) {
                throw new WeatherException(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID);
            }

            return new WeatherRawData(convertToText(sky, pty), sky, pty, wsd);

        } catch (WeatherException e) {
            throw e;
        } catch (Exception e) {
            throw new WeatherException(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID);
        }
    }

    private void validateApiResponse(JsonNode root) {
        JsonNode apiHubResult = root.path("result");
        if (!apiHubResult.isMissingNode()) {
            int status = apiHubResult.path("status").asInt(200);
            if (status != 200) {
                log.warn("KMA APIHub returned status={}, message={}", status, apiHubResult.path("message").asText());
                throw new WeatherException(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID);
            }
        }

        JsonNode responseHeader = root.path("response").path("header");
        if (!responseHeader.isMissingNode()) {
            String resultCode = responseHeader.path("resultCode").asText("00");
            if (!"00".equals(resultCode)) {
                log.warn("KMA API returned resultCode={}, resultMsg={}", resultCode, responseHeader.path("resultMsg").asText());
                throw new WeatherException(WeatherErrorCode.WEATHER_API_RESPONSE_INVALID);
            }
        }
    }

    private String convertToText(String sky, String pty) {
        if (pty != null && !pty.equals("0")) {
            return switch (pty) {
                case "1" -> "rain";
                case "2" -> "rain/snow";
                case "3" -> "snow";
                case "4" -> "shower";
                default -> "precipitation";
            };
        }
        return switch (sky != null ? sky : "1") {
            case "1" -> "clear";
            case "3" -> "mostly cloudy";
            case "4" -> "cloudy";
            default -> "clear";
        };
    }
}
