package org.example.drift_log.customerCenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.util.List;
import java.util.Optional;
import org.example.drift_log.customerCenter.application.AdminNoticeServiceImpl;
import org.example.drift_log.customerCenter.domain.model.Notice;
import org.example.drift_log.customerCenter.domain.repository.NoticeRepository;
import org.example.drift_log.customerCenter.exception.CustomerCenterErrorCode;
import org.example.drift_log.customerCenter.exception.CustomerCenterException;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.AdminNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteNoticeResponse;
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
public class AdminNoticeServiceImplTest {

    @InjectMocks
    private AdminNoticeServiceImpl adminNoticeService;

    @Mock private NoticeRepository noticeRepository;
    @Mock private UserRepository userRepository;

    // ── 픽스처 ──────────────────────────────────────────────
    private Notice 공지(Long id, Long authorId) {
        Notice notice = BeanUtils.instantiateClass(Notice.class);
        ReflectionTestUtils.setField(notice, "id", id);
        ReflectionTestUtils.setField(notice, "title", "공지 제목");
        ReflectionTestUtils.setField(notice, "content", "공지 내용");
        ReflectionTestUtils.setField(notice, "authorId", authorId);
        return notice;
    }

    private User 관리자(Long id, String userId) {
        User user = User.createLocalUser("관리자");
        ReflectionTestUtils.setField(user, "id", id);
        ReflectionTestUtils.setField(user, "userId", userId);
        return user;
    }

    @Nested
    @DisplayName("공지사항 조회")
    class 공지사항_조회 {

        @Test
        @DisplayName("관리자_공지사항_조회_정상_성공")
        void 관리자_공지사항_조회_정상_성공() {
            // given
            given(noticeRepository.findAll()).willReturn(List.of(공지(1L, 10L)));
            given(userRepository.findAllById(List.of(10L)))
                .willReturn(List.of(관리자(10L, "admin-uuid")));

            // when
            List<AdminNoticeResponse> result = adminNoticeService.getNotices();

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).authorName()).isEqualTo("관리자");
        }
    }

    @Nested
    @DisplayName("공지사항 작성")
    class 공지사항_작성 {

        @Test
        @DisplayName("공지사항_작성_정상_성공")
        void 공지사항_작성_정상_성공() {
            // given
            WriteNoticeRequest request = new WriteNoticeRequest("제목", "내용");
            given(userRepository.findByUserId("admin-uuid"))
                .willReturn(Optional.of(관리자(10L, "admin-uuid")));

            // when
            WriteNoticeResponse response = adminNoticeService.writeNotice("admin-uuid", request);

            // then
            assertThat(response).isNotNull();
            verify(noticeRepository).save(any(Notice.class));
        }

        @Test
        @DisplayName("공지사항_작성_유저없음_예외")
        void 공지사항_작성_유저없음_예외() {
            // given
            WriteNoticeRequest request = new WriteNoticeRequest("제목", "내용");
            given(userRepository.findByUserId("ghost")).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> adminNoticeService.writeNotice("ghost", request))
                .isInstanceOf(UserException.class)
                .satisfies(e -> assertThat(((UserException) e).getErrorCode())
                    .isEqualTo(UserErrorCode.USER_NOT_FOUND_BY_ID));
        }
    }

    @Nested
    @DisplayName("공지사항 수정")
    class 공지사항_수정 {

        @Test
        @DisplayName("공지사항_수정_정상_성공")
        void 공지사항_수정_정상_성공() {
            // given
            Notice notice = 공지(1L, 10L);
            given(noticeRepository.findById(1L)).willReturn(Optional.of(notice));
            UpdateNoticeRequest request = new UpdateNoticeRequest("수정 제목", "수정 내용");

            // when
            UpdateNoticeResponse response = adminNoticeService.updateNotice(1L, request);

            // then
            assertThat(response).isNotNull();
            assertThat(notice.getTitle()).isEqualTo("수정 제목");
            assertThat(notice.getContent()).isEqualTo("수정 내용");
            verify(noticeRepository).save(notice);
        }

        @Test
        @DisplayName("공지사항_수정_존재하지않음_예외")
        void 공지사항_수정_존재하지않음_예외() {
            // given
            given(noticeRepository.findById(99L)).willReturn(Optional.empty());
            UpdateNoticeRequest request = new UpdateNoticeRequest("제목", "내용");

            // when & then
            assertThatThrownBy(() -> adminNoticeService.updateNotice(99L, request))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.NOTICE_NOT_FOUND));
        }
    }

    @Nested
    @DisplayName("공지사항 삭제")
    class 공지사항_삭제 {

        @Test
        @DisplayName("공지사항_삭제_정상_성공")
        void 공지사항_삭제_정상_성공() {
            // given
            Notice notice = 공지(1L, 10L);
            given(noticeRepository.findById(1L)).willReturn(Optional.of(notice));

            // when
            adminNoticeService.deleteNotice(1L);

            // then
            verify(noticeRepository).deleteById(1L);
        }

        @Test
        @DisplayName("공지사항_삭제_존재하지않음_예외")
        void 공지사항_삭제_존재하지않음_예외() {
            // given
            given(noticeRepository.findById(99L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> adminNoticeService.deleteNotice(99L))
                .isInstanceOf(CustomerCenterException.class)
                .satisfies(e -> assertThat(((CustomerCenterException) e).getErrorCode())
                    .isEqualTo(CustomerCenterErrorCode.NOTICE_NOT_FOUND));
        }
    }
}