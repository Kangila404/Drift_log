package org.example.drift_log.city.infrastructure.persistence.repository;

import java.util.Optional;
import org.example.drift_log.city.domain.model.CityRoute;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityRouteJpaRepository extends JpaRepository<CityRoute,Long> {

    Optional<CityRoute> findByFromCityIdAndToCityId(Long fromCityId, Long toCityId);
}
