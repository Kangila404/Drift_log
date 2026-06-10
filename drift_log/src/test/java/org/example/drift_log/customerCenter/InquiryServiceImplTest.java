package org.example.drift_log.customerCenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.customerCenter.application.InquiryServiceImpl;
import org.example.drift_log.customerCenter.domain.enums.InquiryStatus;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
import org.example.drift_log.customerCenter.domain.repository.InquiryRepository;
import org.example.drift_log.customerCenter.exception.CustomerCenterErrorCode;
import org.example.drift_log.customerCenter.exception.CustomerCenterException;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateInquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteInquiryResponse;
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
public class InquiryServiceImplTest {

    @InjectMocks
    private InquiryServiceImpl inquiryService;

    @Mock private InquiryRepository inquiryRepository;
    @Mock private UserRepository userRepository;

    // ── 픽스처 ──────────────────────────────────────────────
    private Inquiry 문의(Long id, Long authorId) {
        Inquiry inquiry = BeanUtils.instantiateClass(Inquiry.class);
        ReflectionTestUtils.setField(inquiry, "id", id);
        ReflectionTestUtils.setField(inquiry, "title", "문의 제목");
        ReflectionTestUtils.setField(inquiry, "content", "문의 내용");
        ReflectionTestUtils.setField(inquiry, "authorId", authorId);
        ReflectionTestUtils.setField(inquiry, "inquiryStatus", InquiryStatus.OPEN);
        return inquiry;
    }

    private User 유저(Long id, String userId, String name) {
        User user = User.createLocalUser(name);
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }

    @Nested
    @DisplayName("전체 문의 조회 (관리자)")
    class 전체_문의_조회 {

        @Test
        @DisplayName("전체_문의_조회_정상_성공")
        void 전체_문의_조회_정상_성공() {
            // given
            given(inquiryRepository.findAll())
                .willReturn(List.of(문의(1L, 10L), 문의(2L, 20L)));
            given(userRepository.findAllById(any()))
                .willReturn(List.of(유저(10L, "uuid-a", "유저A"), 유저(20L, "uuid-b", "유저B")));

            // when
            List<InquiryResponse> result = inquiryService.findAllInquiries();

            // then
            assertThat(result).hasSize(2);
        }
    }

    @Nested
    @DisplayName("문의 작성")
    class 문의_작성 {

        @Test
        @DisplayName("문의_작성_정상_성공")
        void 문의_작성_정상_성공() {
            // given
            WriteInquiryRequest request = new WriteInquiryRequest("제목", "내용");
            given(userRepository.findByUserId("uuid-a"))
                .willReturn(Optional.of(유저(10L, "uuid-a", "유저A")));

            // when
            WriteInquiryResponse response = inquiryService.writeInquiry("uuid-a", request);

            // then
            assertThat(response).isNotNull();
            verify(inquiryRepository).save(any(Inquiry.class));
        }

        @Test
        @DisplayName("문의_작성_유저없음_예외")
        void 문의_작성_유저없음_예외() {
            // given
            WriteInquiryRequest request = new WriteInquiryRequest("제목", "내용");
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> inquiryService.writeInquiry("ghost", request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND_BY_ID));
        }
    }

    @Nested
    @DisplayName("내 문의 조회")
    class 내_문의_조회 {

        @Test
        @DisplayName("내_문의_조회_정상_성공")
        void 내_문의_조회_정상_성공() {
            // given
            given(userRepository.findByUserId("uuid-a"))
                .willReturn(Optional.of(유저(10L, "uuid-a", "유저A")));
            given(inquiryRepository.findAllByAuthorId(10L))
                .willReturn(List.of(문의(1L, 10L)));

            // when
            List<InquiryResponse> result = inquiryService.getInquiries("uuid-a");

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).authorName()).isEqualTo("유저A");
        }
    }

    @Nested
    @DisplayName("문의 수정")
    class 문의_수정 {

        @Test
        @DisplayName("문의_수정_정상_성공")
        void 문의_수정_정상_성공() {
            // given
            Inquiry inquiry = 문의(1L, 10L);
            given(userRepository.findByUserId("uuid-a"))
                .willReturn(Optional.of(유저(10L, "uuid-a", "유저A")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            UpdateInquiryRequest request = new UpdateInquiryRequest("수정 제목", "수정 내용");

            // when
            UpdateInquiryResponse response = inquiryService.updateInquiry("uuid-a", 1L, request);

            // then
            assertThat(response).isNotNull();
            assertThat(inquiry.getTitle()).isEqualTo("수정 제목");
            verify(inquiryRepository).save(inquiry);
        }

        @Test
        @DisplayName("문의_수정_작성자_아님_예외")
        void 문의_수정_작성자_아님_예외() {
            // given - 문의 작성자는 10L, 요청자는 20L
            Inquiry inquiry = 문의(1L, 10L);
            given(userRepository.findByUserId("uuid-b"))
                .willReturn(Optional.of(유저(20L, "uuid-b", "유저B")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));
            UpdateInquiryRequest request = new UpdateInquiryRequest("수정 제목", "수정 내용");

            // when & then
            assertThatThrownBy(() -> inquiryService.updateInquiry("uuid-b", 1L, request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INVALID_INQUIRY_ACCESS));

            verify(inquiryRepository, never()).save(any());
        }

        @Test
        @DisplayName("문의_수정_존재하지않음_예외")
        void 문의_수정_존재하지않음_예외() {
            // given
            given(userRepository.findByUserId("uuid-a"))
                .willReturn(Optional.of(유저(10L, "uuid-a", "유저A")));
            given(inquiryRepository.findById(99L)).willReturn(Optional.empty());
            UpdateInquiryRequest request = new UpdateInquiryRequest("제목", "내용");

            // when & then
            assertThatThrownBy(() -> inquiryService.updateInquiry("uuid-a", 99L, request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("문의 삭제")
    class 문의_삭제 {

        @Test
        @DisplayName("문의_삭제_정상_성공")
        void 문의_삭제_정상_성공() {
            // given
            Inquiry inquiry = 문의(1L, 10L);
            given(userRepository.findByUserId("uuid-a"))
                .willReturn(Optional.of(유저(10L, "uuid-a", "유저A")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));

            // when
            inquiryService.deleteInquiry("uuid-a", 1L);

            // then
            verify(inquiryRepository).deleteById(1L);
        }

        @Test
        @DisplayName("문의_삭제_작성자_아님_예외")
        void 문의_삭제_작성자_아님_예외() {
            // given - 작성자 10L, 요청자 20L
            Inquiry inquiry = 문의(1L, 10L);
            given(userRepository.findByUserId("uuid-b"))
                .willReturn(Optional.of(유저(20L, "uuid-b", "유저B")));
            given(inquiryRepository.findById(1L)).willReturn(Optional.of(inquiry));

            // when & then
            assertThatThrownBy(() -> inquiryService.deleteInquiry("uuid-b", 1L))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.INVALID_INQUIRY_ACCESS));

            verify(inquiryRepository, never()).deleteById(any());
        }
    }
}