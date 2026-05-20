package org.example.drift_log.city.domain.repository;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.city.domain.model.City;

public interface CityRepository {
    List<City> findAll();

    Optional<City> findById(Long id);

    boolean existsById(Long id);
}
