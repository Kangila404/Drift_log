package org.example.drift_log.customerCenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import java.util.Optional;
import org.example.drift_log.customerCenter.application.InquiryAnswerServiceImpl;
import org.example.drift_log.customerCenter.domain.enums.InquiryStatus;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.example.drift_log.customerCenter.domain.model.InquiryAnswer;
import org.example.drift_log.customerCenter.domain.repository.InquiryRepository;
import org.example.drift_log.customerCenter.exception.CustomerCenterErrorCode;
import org.example.drift_log.customerCenter.exception.CustomerCenterException;
import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerUpdateRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerUpdateResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.example.drift_log.user.exception.UserErrorCode;
import org.example.drift_log.user.exception.UserException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
public class InquiryAnswerServiceImplTest {

    @InjectMocks
    private InquiryAnswerServiceImpl inquiryAnswerService;

    @Mock private InquiryRepository inquiryRepository;
    @Mock private UserRepository userRepository;

    // ── 픽스처 ──────────────────────────────────────────────
    private Inquiry 문의(Long id, InquiryStatus status) {
        Inquiry inquiry = BeanUtils.instantiateClass(Inquiry.class);
        ReflectionTestUtils.setField(inquiry, "id", id);
        ReflectionTestUtils.setField(inquiry, "title", "문의 제목");
        ReflectionTestUtils.setField(inquiry, "content", "문의 내용");
        ReflectionTestUtils.setField(inquiry, "authorId", 10L);
        ReflectionTestUtils.setField(inquiry, "inquiryStatus", status);
        return inquiry;
    }

    // 답변이 달린 문의 (수정/삭제 테스트용)
    private Inquiry 답변달린_문의(Long id) {
        Inquiry inquiry = 문의(id, InquiryStatus.ANSWERED);
        InquiryAnswer answer = BeanUtils.instantiateClass(InquiryAnswer.class);
        ReflectionTestUtils.setField(answer, "id", 100L);
        ReflectionTestUtils.setField(answer, "content", "기존 답변");
        ReflectionTestUtils.setField(answer, "answererId", 99L);
        ReflectionTestUtils.setField(answer, "inquiry", inquiry);
        ReflectionTestUtils.setField(inquiry, "inquiryAnswer", answer);
        return inquiry;
    }

    private User 관리자(Long id, String userId) {
        User user = User.createLocalUser("관리자");
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }

    @Nested
    @DisplayName("답변 등록")
    class 답변_등록 {

        @Test
        @DisplayName("답변_등록_정상_성공")
        void 답변_등록_정상_성공() {
            // given - OPEN 상태 문의
            Inquiry inquiry = 문의(1L, InquiryStatus.OPEN);
            given(userRepository.findByUserId("admin-uuid"))
                .willReturn(Optional.of(관리자(99L, "admin-uuid")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            InquiryAnswerRequest request = new InquiryAnswerRequest("답변 내용");

            // when
            InquiryAnswerResponse response =
                inquiryAnswerService.writeAnswer(1L, "admin-uuid", request);

            // then - 상태 ANSWERED 전이 + 답변 연결 검증
            assertThat(response).isNotNull();
            assertThat(inquiry.getInquiryStatus()).isEqualTo(InquiryStatus.ANSWERED);
            assertThat(inquiry.getInquiryAnswer()).isNotNull();
            assertThat(inquiry.getInquiryAnswer().getContent()).isEqualTo("답변 내용");
        }

        @Test
        @DisplayName("답변_등록_이미_답변됨_예외")
        void 답변_등록_이미_답변됨_예외() {
            // given - 이미 ANSWERED 상태
            Inquiry inquiry = 답변달린_문의(1L);
            given(userRepository.findByUserId("admin-uuid"))
                .willReturn(Optional.of(관리자(99L, "admin-uuid")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            InquiryAnswerRequest request = new InquiryAnswerRequest("또 답변");

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.writeAnswer(1L, "admin-uuid", request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.ALREADY_ANSWERED));
        }

        @Test
        @DisplayName("답변_등록_관리자_없음_예외")
        void 답변_등록_관리자_없음_예외() {
            // given
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());
            InquiryAnswerRequest request = new InquiryAnswerRequest("답변");

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.writeAnswer(1L, "ghost", request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND_BY_ID));
        }

        @Test
        @DisplayName("답변_등록_문의_없음_예외")
        void 답변_등록_문의_없음_예외() {
            // given
            given(userRepository.findByUserId("admin-uuid"))
                .willReturn(Optional.of(관리자(99L, "admin-uuid")));
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());
            InquiryAnswerRequest request = new InquiryAnswerRequest("답변");

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.writeAnswer(99L, "admin-uuid", request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("답변 수정")
    class 답변_수정 {

        @Test
        @DisplayName("답변_수정_정상_성공")
        void 답변_수정_정상_성공() {
            // given
            Inquiry inquiry = 답변달린_문의(1L);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            InquiryAnswerUpdateRequest request = new InquiryAnswerUpdateRequest("수정된 답변");

            // when
            InquiryAnswerUpdateResponse response =
                inquiryAnswerService.updateAnswer(1L, request);

            // then
            assertThat(response).isNotNull();
            assertThat(inquiry.getInquiryAnswer().getContent()).isEqualTo("수정된 답변");
        }

        @Test
        @DisplayName("답변_수정_답변_없음_예외")
        void 답변_수정_답변_없음_예외() {
            // given - 답변 없는 OPEN 문의
            Inquiry inquiry = 문의(1L, InquiryStatus.OPEN);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            InquiryAnswerUpdateRequest request = new InquiryAnswerUpdateRequest("수정");

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.updateAnswer(1L, request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.ANSWER_NOT_FOUND));
        }

        @Test
        @DisplayName("답변_수정_문의_없음_예외")
        void 답변_수정_문의_없음_예외() {
            // given
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());
            InquiryAnswerUpdateRequest request = new InquiryAnswerUpdateRequest("수정");

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.updateAnswer(99L, request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("답변 삭제")
    class 답변_삭제 {

        @Test
        @DisplayName("답변_삭제_정상_성공")
        void 답변_삭제_정상_성공() {
            // given
            Inquiry inquiry = 답변달린_문의(1L);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));

            // when
            inquiryAnswerService.deleteAnswer(1L);

            // then - 답변 연결 해제 + 상태 OPEN 복귀
            assertThat(inquiry.getInquiryAnswer()).isNull();
            assertThat(inquiry.getInquiryStatus()).isEqualTo(InquiryStatus.OPEN);
        }

        @Test
        @DisplayName("답변_삭제_답변_없음_예외")
        void 답변_삭제_답변_없음_예외() {
            // given - 답변 없는 문의
            Inquiry inquiry = 문의(1L, InquiryStatus.OPEN);
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.deleteAnswer(1L))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.ANSWER_NOT_FOUND));
        }

        @Test
        @DisplayName("답변_삭제_문의_없음_예외")
        void 답변_삭제_문의_없음_예외() {
            // given
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> inquiryAnswerService.deleteAnswer(99L))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
        }
    }
}