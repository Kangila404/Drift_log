package org.example.drift_log.customerCenter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import java.util.List;
import org.example.drift_log.customerCenter.application.NoticeServiceImpl;
import org.example.drift_log.customerCenter.domain.model.Notice;
import org.example.drift_log.customerCenter.domain.repository.NoticeRepository;
import org.example.drift_log.customerCenter.presentation.dto.res.NoticeResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
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
public class NoticeServiceImplTest {

    @InjectMocks
    private NoticeServiceImpl noticeService;

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

    private User 유저(Long id, String name) {
        User user = User.createLocalUser("admin@test.com", "encoded", name);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    @Nested
    @DisplayName("공지사항 조회")
    class 공지사항_조회 {

        @Test
        @DisplayName("공지사항_조회_정상_성공")
        void 공지사항_조회_정상_성공() {
            // given
            Notice n1 = 공지(1L, 10L);
            Notice n2 = 공지(2L, 10L);
            given(noticeRepository.findAll()).willReturn(List.of(n1, n2));
            given(userRepository.findAllById(List.of(10L)))
                .willReturn(List.of(유저(10L, "관리자")));

            // when
            List<NoticeResponse> result = noticeService.getNotices();

            // then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).authorName()).isEqualTo("관리자");
            assertThat(result.get(0).title()).isEqualTo("공지 제목");
        }

        @Test
        @DisplayName("공지사항_조회_작성자_없으면_알수없음")
        void 공지사항_조회_작성자_없으면_알수없음() {
            // given - authorId 99L 의 User 가 조회되지 않는 경우
            Notice n1 = 공지(1L, 99L);
            given(noticeRepository.findAll()).willReturn(List.of(n1));
            given(userRepository.findAllById(List.of(99L))).willReturn(List.of());

            // when
            List<NoticeResponse> result = noticeService.getNotices();

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).authorName()).isEqualTo("(알 수 없음)");
        }

        @Test
        @DisplayName("공지사항_조회_빈목록_정상")
        void 공지사항_조회_빈목록_정상() {
            // given
            given(noticeRepository.findAll()).willReturn(List.of());
            given(userRepository.findAllById(List.of())).willReturn(List.of());

            // when
            List<NoticeResponse> result = noticeService.getNotices();

            // then
            assertThat(result).isEmpty();
        }
    }
}