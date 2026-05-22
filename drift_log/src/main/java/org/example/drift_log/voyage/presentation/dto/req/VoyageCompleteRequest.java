package org.example.drift_log.voyage.presentation.dto.req;

import java.util.List;

public record VoyageCompleteRequest(
    List<Long> eventIds
) {

}
