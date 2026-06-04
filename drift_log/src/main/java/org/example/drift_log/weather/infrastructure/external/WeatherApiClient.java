package org.example.drift_log.weather.infrastructure.external;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.drift_log.weather.domain.port.WeatherApiPort;
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

    public WeatherRawData fetchTodayWeather() {
        String baseDate = LocalDate.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyyMMdd"));


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
            JsonNode items = new ObjectMapper().readTree(response)
                .path("response").path("body").path("items").path("item");

            String sky = null;
            String pty = null;
            String wsd = null;

            for (JsonNode item : items) {
                if (!item.path("fcstDate").asText().equals(baseDate))
                    continue;
                if (!item.path("fcstTime").asText().equals("1200"))
                    continue;

                String category = item.path("category").asText();
                if (category.equals("SKY"))
                    sky = item.path("fcstValue").asText();
                if (category.equals("PTY"))
                    pty = item.path("fcstValue").asText();
                if (category.equals("WSD"))
                    wsd = item.path("fcstValue").asText();
            }

            return new WeatherRawData(convertToText(sky, pty), sky, pty, wsd);

        } catch (Exception e) {
            throw new RuntimeException("날씨 파싱 실패", e);
        }
    }


    private String convertToText(String sky, String pty) {
        if (pty != null && !pty.equals("0")) {
            return switch (pty) {
                case "1" -> "비";
                case "2" -> "비/눈";
                case "3" -> "눈";
                case "4" -> "소나기";
                default -> "강수";
            };
        }
        return switch (sky != null ? sky : "1") {
            case "1" -> "맑음";
            case "3" -> "구름많음";
            case "4" -> "흐림";
            default -> "맑음";
        };

    }

}


