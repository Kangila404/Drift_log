package org.example.drift_log.feedback;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.Optional;
import org.example.drift_log.feedback.application.FeedBackServiceImpl;
import org.example.drift_log.feedback.domain.repository.EndingFeedBackRepository;
import org.example.drift_log.feedback.exception.FeedbackErrorCode;
import org.example.drift_log.feedback.exception.FeedbackException;
import org.example.drift_log.feedback.presentation.dto.req.EndingFeedBackRequest;
import org.example.drift_log.feedback.presentation.dto.res.EndingFeedBackResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class FeedBackServiceImplTest {

    @InjectMocks private FeedBackServiceImpl feedBackService;

    @Mock private EndingFeedBackRepository endingFeedBackRepository;
    @Mock private UserRepository userRepository;

    // ── 공통 픽스처 ──────────────────────────────────────────────
    private User 활성유저() {
        User user = User.createLocalUser("test@test.com", "encoded", "테스터");
        ReflectionTestUtils.setField(user, "id", 1L);
        return user;
    }

    // ================================================================
    // 피드백 작성
    // ================================================================
    @Nested
    @DisplayName("피드백작성")
    class 피드백작성 {

        @Test
        @DisplayName("피드백_최초작성_성공")
        void 피드백_최초작성_성공() {
            // given
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(endingFeedBackRepository.existsByUserId(anyLong())).willReturn(false);

            // when
            EndingFeedBackResponse response = feedBackService.writeFeedback("uuid",
                new EndingFeedBackRequest("정말 좋았어요!"));

            // then
            assertThat(response.message()).isEqualTo("success");
            verify(endingFeedBackRepository).save(any());
        }

        @Test
        @DisplayName("피드백_이미존재할때_예외")
        void 피드백_이미존재할때_예외() {
            // given - 이미 피드백을 작성한 유저
            given(userRepository.findByUserId("uuid")).willReturn(Optional.of(활성유저()));
            given(endingFeedBackRepository.existsByUserId(anyLong())).willReturn(true);

            // when & then
            assertThatThrownBy(() -> feedBackService.writeFeedback("uuid",
                new EndingFeedBackRequest("또 쓰기")))
                .isInstanceOf(FeedbackException.class)
                .satisfies(e -> assertThat(((FeedbackException) e).getErrorCode())
                    .isEqualTo(FeedbackErrorCode.FEEDBACK_ALREADY_EXISTS));
        }

        @Test
        @DisplayName("피드백_존재하지않는유저_예외")
        void 피드백_존재하지않는유저_예외() {
            // given
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> feedBackService.writeFeedback("ghost",
                new EndingFeedBackRequest("내용")))
                .isInstanceOf(FeedbackException.class)
                .satisfies(e -> assertThat(((FeedbackException) e).getErrorCode())
                    .isEqualTo(FeedbackErrorCode.USER_NOT_FOUND));
        }
    }
}