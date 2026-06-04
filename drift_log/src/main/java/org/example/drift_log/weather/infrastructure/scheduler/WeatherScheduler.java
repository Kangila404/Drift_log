package org.example.drift_log.weather.infrastructure.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.drift_log.weather.application.WeatherService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WeatherScheduler {

    private final WeatherService weatherService;

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void updateTodayWeather(){
        log.info("날씨 업데이트 시작");
        weatherService.updateTodayWeather();
        log.info("날씨 업데이트 완료");
    }

}
