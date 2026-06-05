package org.example.drift_log.admin.presentation.dto.res;

import org.example.drift_log.admin.domain.model.AppVersion;

public record VersionResponse(
    String version
) {
    public static VersionResponse from(AppVersion appVersion) {
        return new VersionResponse(appVersion.getVersion());
    }

    public static VersionResponse of(String version) {
        return new VersionResponse(version);
    }
}
