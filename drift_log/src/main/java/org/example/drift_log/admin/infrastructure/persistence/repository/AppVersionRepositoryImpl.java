package org.example.drift_log.admin.infrastructure.persistence.repository;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.admin.domain.model.AppVersion;
import org.example.drift_log.admin.domain.repository.AppVersionRepository;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class AppVersionRepositoryImpl implements AppVersionRepository {

    private final AppVersionJpaRepository appVersionJpaRepository;

    @Override
    public Optional<AppVersion> findLatestAppVersion() {
        return appVersionJpaRepository.findTopByOrderByIdDesc();
}

    @Override
    public void save(AppVersion appVersion) {
        appVersionJpaRepository.save(appVersion);
    }

}
