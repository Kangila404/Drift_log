package org.example.drift_log.feedback.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.feedback.domain.model.EndingFeedback;
import org.example.drift_log.feedback.domain.repository.EndingFeedBackRepository;
import org.example.drift_log.feedback.presentation.dto.req.EndingFeedBackRequest;
import org.example.drift_log.feedback.presentation.dto.res.EndingFeedBackResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class FeedBackServiceImpl implements FeedBackService {

    private final EndingFeedBackRepository endingFeedBackRepository;
    private final UserRepository userRepository;

    @Override
    public EndingFeedBackResponse writeFeedback(String userId, EndingFeedBackRequest request) {
        User user = findUserByUserIdOrThrow(userId);

        // 만약 이미 피드백이 있다면
        if(endingFeedBackRepository.existsByUserId(user.getId())){
            throw new IllegalArgumentException("이미 피드백이 존재합니다");
        }

        EndingFeedback feedBack = EndingFeedback.create(request.content(), user);
        endingFeedBackRepository.save(feedBack);

        return new EndingFeedBackResponse("success");
    }

    // ==== 메서드 모음 ==== //
    // 1. (String) userId -> User 조회
    private User findUserByUserIdOrThrow(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new IllegalArgumentException("해당 유저를 찾을 수 없습니다"));
    }
}
