package org.example.drift_log.user.presentation.dto.req;

import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(
    @Size(max = 8192) String appleIdentityToken,
    @Size(max = 4096) String appleAuthorizationCode
) {
    @Override
    public String toString() {
        return "DeleteAccountRequest[credentials=REDACTED]";
    }
}
