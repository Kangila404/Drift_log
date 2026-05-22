package org.example.drift_log.randomEvent.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.randomEvent.domain.model.RandomEvent;
import org.example.drift_log.randomEvent.domain.repository.RandomEventRepository;
import org.example.drift_log.randomEvent.presentation.dto.res.RandomEventResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RandomEventServiceImpl implements RandomEventService {

    private final RandomEventRepository randomEventRepository;

    @Override
    public RandomEventResponse getRandomEvent() {
        RandomEvent event = randomEventRepository.findRandom()
            .orElseThrow(() -> new IllegalStateException("이벤트가 없습니다."));
        return RandomEventResponse.from(event);
    }
}
