package org.example.drift_log.customBoat.application;

import org.example.drift_log.customBoat.presentation.dto.req.UpdateBoatRequest;
import org.example.drift_log.customBoat.presentation.dto.res.CustomBoatResponse;
import org.springframework.stereotype.Service;


public interface CustomBoatService {
    CustomBoatResponse getMyBoat(String userId);

    void updateBoat(String userId, UpdateBoatRequest request);
}
