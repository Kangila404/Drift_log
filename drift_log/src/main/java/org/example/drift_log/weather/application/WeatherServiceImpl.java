package org.example.drift_log.weather.application;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.drift_log.weather.domain.model.Weather;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.port.WeatherApiPort;
import org.example.drift_log.weather.domain.repository.WeatherRepository;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.example.drift_log.weather.exception.WeatherErrorCode;
import org.example.drift_log.weather.exception.WeatherException;
import org.example.drift_log.weather.presentation.dto.res.WeatherRawData;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherServiceImpl implements WeatherService{

    private final WeatherRepository weatherRepository;
    private final WeatherThemeRepository weatherThemeRepository;
    private final WeatherApiPort weatherApiPort;
    private final Random random = new Random();

    @Override
    public void updateTodayWeather() {
        validateTodayWeatherTheme();

        // 1. 이상날씨 우선 체크 (10일에 1번)
        long inGameWeatherId;
        String realWeatherText;
        boolean isAbnormal = isAbnormalDay();

        if (isAbnormal) {
            // 일식(8) or 붉은 달(9) 랜덤
            inGameWeatherId = (random.nextInt(2) == 0) ? 8L : 9L;
            realWeatherText = "이상날씨";
        } else {
            WeatherRawData raw = weatherApiPort.fetchTodayWeather();
            inGameWeatherId = convertToInGameWeather(raw.sky(), raw.pty(), raw.wsd());
            realWeatherText = raw.skyText();
        }

        log.info("인게임 날씨 id={}, 이상날씨={}", inGameWeatherId, isAbnormal);

        Weather weather = weatherRepository.findById(inGameWeatherId)
            .orElseThrow(() -> new WeatherException(WeatherErrorCode.WEATHER_NOT_FOUND));

        weatherThemeRepository.save(
            WeatherTheme.changeWeather(realWeatherText, weather, isAbnormal)
        );
    }


    // ========== 관련 메서드 ========== //
    // 1. 실제 날씨 정보 -> 인게임 날씨
    private long convertToInGameWeather(String sky, String pty, String wsd) {
        double windSpeed = Double.parseDouble(wsd != null ? wsd : "0");

        // 강수 있을 때
        if (pty != null && !pty.equals("0")) {
            if (windSpeed >= 8) return 6L;  // 폭풍우
            if (windSpeed >= 4) return 5L;  // 거친 파도
            return switch (pty) {
                case "1", "2" -> 4L;  // 잔잔한 비
                case "3" -> 6L;       // 눈 -> 폭풍우
                case "4" -> 5L;       // 소나기 -> 거친 파도
                default -> 4L;
            };
        }

        // 강수 없을 때
        if (windSpeed >= 8) return 6L;  // 폭풍우
        if (windSpeed >= 4) return 5L;  // 거친 파도

        return switch (sky != null ? sky : "1") {
            case "1" -> 1L;   // 맑음 -> 잔잔한 수면
            case "3" -> 2L;   // 구름많음 -> 흐린 수평선
            case "4" -> 3L;   // 흐림 -> 안개 낀 바다
            default -> 1L;
        };
    }

    // 2. 금일 WeatherTheme 이미 존재 확인
    private void validateTodayWeatherTheme(){
       boolean isWeatherExist =  weatherThemeRepository.existsByDate(LocalDate.now(ZoneId.of("Asia/Seoul")));
       if(isWeatherExist){
           throw new WeatherException(WeatherErrorCode.TODAY_WEATHER_ALREADY_EXISTS);
       }
    }

    // 3. 10일에 1번 이상날씨 발동
    private boolean isAbnormalDay() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return today.getDayOfMonth() % 10 == 0; // 10일, 20일, 30일
    }
}
