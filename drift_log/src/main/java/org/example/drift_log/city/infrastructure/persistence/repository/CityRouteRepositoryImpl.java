package org.example.drift_log.city.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.domain.model.CityRoute;
import org.example.drift_log.city.domain.repository.CityRouteRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CityRouteRepositoryImpl implements CityRouteRepository {

    private final CityRouteJpaRepository cityRouteJpaRepository;

    @Override
    public Optional<CityRoute> findByFromCityIdAndToCityId(Long fromCityId, Long toCityId) {
        return cityRouteJpaRepository.findByFromCityIdAndToCityId(fromCityId, toCityId);
    }
}
