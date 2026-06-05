package org.example.drift_log.admin.presentation.dto.res;

public record UpdateVersionResponse(
    String content
) {
    public static UpdateVersionResponse from(String content) {
        return new UpdateVersionResponse(content);
    }
}
