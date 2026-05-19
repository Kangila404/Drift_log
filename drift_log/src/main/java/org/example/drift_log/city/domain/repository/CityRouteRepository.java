package org.example.drift_log.city.domain.repository;

import java.util.Optional;
import org.example.drift_log.city.domain.model.CityRoute;

public interface CityRouteRepository {
    Optional<CityRoute> findByFromCityIdAndToCityId(Long fromCityId, Long toCityId);
}
