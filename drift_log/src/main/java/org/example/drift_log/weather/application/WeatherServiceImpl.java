package org.example.drift_log.weather.application;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.domain.model.Weather;
import org.example.drift_log.weather.domain.model.WeatherTheme;
import org.example.drift_log.weather.domain.port.WeatherApiPort;
import org.example.drift_log.weather.domain.repository.WeatherRepository;
import org.example.drift_log.weather.domain.repository.WeatherThemeRepository;
import org.example.drift_log.weather.infrastructure.persistence.repository.WeatherThemeJpaRepository;
import org.example.drift_log.weather.presentation.dto.WeatherRawData;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class WeatherServiceImpl implements WeatherService{

    private final WeatherRepository weatherRepository;
    private final WeatherThemeRepository weatherThemeRepository;
    private final WeatherApiPort weatherApiPort;


    @Override
    public void updateTodayWeather() {
        validateTodayWeatherTheme();

        WeatherRawData raw = weatherApiPort.fetchTodayWeather();
        long inGameWeatherId = convertToInGameWeather(raw.sky(), raw.pty(), raw.wsd());

        Weather weather = weatherRepository.findById(inGameWeatherId)
            .orElseThrow(() -> new IllegalArgumentException("날씨를 찾을 수 없습니다"));

        // 5 이상부터 이상 날씨
        boolean isAbnormal = inGameWeatherId >= 5L;

        weatherThemeRepository.save(
            WeatherTheme.changeWeather(raw.skyText(), weather, isAbnormal)
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
       boolean isWeatherExist =  weatherThemeRepository.existsByDate(LocalDate.now());
       if(isWeatherExist){
           throw new IllegalStateException("이미 오늘의 날씨가 존재합니다");
       }
    }
}
