package org.example.drift_log.city.infrastructure.persistence.repository;

import org.example.drift_log.city.domain.model.City;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CityJpaRepository extends JpaRepository<City,Long> {

}
