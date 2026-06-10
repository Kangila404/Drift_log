package org.example.drift_log.customBoat.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customBoat.domain.model.CustomBoat;
import org.example.drift_log.customBoat.domain.repository.CustomBoatRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CustomBoatRepositoryImpl implements CustomBoatRepository {

    private final CustomBoatJpaRepository customBoatJpaRepository;

    @Override
    public Optional<CustomBoat> findByUserId(Long userId) {
        return customBoatJpaRepository.findByUserId(userId);
    }

    @Override
    public void save(CustomBoat customBoat) {
        customBoatJpaRepository.save(customBoat);
    }
}
