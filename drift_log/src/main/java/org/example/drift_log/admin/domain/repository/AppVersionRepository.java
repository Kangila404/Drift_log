package org.example.drift_log.admin.domain.repository;

import java.util.Optional;
import org.example.drift_log.admin.domain.model.AppVersion;

public interface AppVersionRepository {
    Optional<AppVersion> findLatestAppVersion();

    void save(AppVersion appVersion);
}
