package org.example.drift_log.city.presentation.dto.res;

import java.util.List;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.model.CityRoute;

public record MapResponse(
    String voyageState,
    List<MapDetail> maps,
    MapDetail currentCity,
    MapDetail departedCity,
    MapDetail destinationCity,
    Float progress,
    Integer remainingSeconds
) {

    public record MapDetail(
        Long cityId,
        String cityName
    ) {
        public static MapDetail from(City city) {
            return new MapDetail(
                city.getId(),
                city.getName()
            );
        }
    }

    // ANCHORED용
    public static MapResponse ofAnchored(List<City> cities, City currentCity) {
        return new MapResponse(
            "ANCHORED",
            cities.stream().map(MapDetail::from).toList(),
            MapDetail.from(currentCity),
            null,
            null,
            null,
            null
        );
    }

    // SAILING용
    public static MapResponse ofSailing(String voyageState,List<City> cities, City departedCity, City destinationCity, Float progress, CityRoute cityRoute) {
        int totalSeconds = cityRoute.getDurationMinutes() * 60;
        int remaining = (int)(totalSeconds * (1 - progress));

        return new MapResponse(
            voyageState,
            cities.stream().map(MapDetail::from).toList(),
            null,
            MapDetail.from(departedCity),
            MapDetail.from(destinationCity),
            progress,
            Math.max(0, remaining)
        );
    }
}