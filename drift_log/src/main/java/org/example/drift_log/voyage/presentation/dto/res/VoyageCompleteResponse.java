package org.example.drift_log.voyage.presentation.dto.res;

import java.util.List;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.randomEvent.domain.model.VoyageEvent;
import org.example.drift_log.trace.domain.model.DiscoveredTrace;
import org.example.drift_log.trace.domain.model.Trace;
import org.example.drift_log.voyage.domain.entity.VoyageLog;

public record VoyageCompleteResponse(
    CityInfo arrivedCity,
    TraceInfo discoverdTrace,
    LogInfo voyageLog,
    boolean isEnding
) {

    // 1. CityInfo
    public record CityInfo(
        Long cityId,
        String cityName,
        String desription,
        String imgUrl,
        String bgmUrl
    ){
        public static CityInfo from(City city){
            return new CityInfo(
                city.getId(),
                city.getName(),
                city.getDescription(),
                city.getImgUrl(),
                city.getBgmUrl()
            );
        }
    }

    // 2. TraceInfo
    public record TraceInfo(
        String familyMember,
        String content,
        String imgUrl
    ){
        public static TraceInfo from(Trace trace) {
            return new TraceInfo(
                trace.getFamilyMember().name(),
                trace.getContent(),
                trace.getImageUrl()
            );
        }
    }

    // 3. LogInfo
    public record LogInfo(
        String autoText,
        String weatherTheme,
        List<EventInfo> events
    ){
        public static LogInfo from(VoyageLog log) {
            return new LogInfo(
                log.getAutoText(),
                log.getWeatherTheme(),
                log.getVoyageEvents().stream()
                    .map(EventInfo::from)
                    .toList()
            );
        }
    }

    // 4. EventInfo 추가
    public record EventInfo(
        Long eventId,
        String eventName
    ){
        public static EventInfo from(VoyageEvent voyageEvent) {
            return new EventInfo(
                voyageEvent.getRandomEvent().getId(),
                voyageEvent.getRandomEvent().getName()
            );
        }
    }



    // 전체 정적 팩토리 메서드
    public static VoyageCompleteResponse of(City city, Trace trace, VoyageLog log, boolean isEnding){
        return new VoyageCompleteResponse(
            CityInfo.from(city),
            trace != null ? TraceInfo.from(trace) : null,
            LogInfo.from(log),
            isEnding
        );
    }
}
