package org.example.drift_log.weather.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.weather.domain.model.Weather;
import org.example.drift_log.weather.domain.repository.WeatherRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class WeatherRepositoryImpl implements WeatherRepository {

    private final WeatherJpaRepository weatherJpaRepository;

    @Override
    public Optional<Weather> findById(Long id) {
        return weatherJpaRepository.findById(id);
    }
}
