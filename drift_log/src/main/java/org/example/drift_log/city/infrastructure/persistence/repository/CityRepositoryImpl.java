package org.example.drift_log.city.infrastructure.persistence.repository;

import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.city.domain.model.City;
import org.example.drift_log.city.domain.repository.CityRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CityRepositoryImpl implements CityRepository {

    private final CityJpaRepository cityJpaRepository;

    @Override
    public List<City> findAll() {
        return cityJpaRepository.findAll();
    }

    @Override
    public Optional<City> findById(Long id) {
        return cityJpaRepository.findById(id);
    }
}
