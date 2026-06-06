package org.example.drift_log.customerCenter.application;

import static java.util.stream.Collectors.toList;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class AdminNoticeServiceImpl implements AdminNoticeService{

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly=true)
    @Override
    public List<AdminNoticeResponse> getNotices() {
        List<Notice> notices = noticeRepository.findAll();

        // 모든 작성자 id 조회
        List<Long> authorIds = notices.stream()
            .map(Notice::getAuthorId)
            .distinct()
            .toList();

        Map<Long,String> nameMap = userRepository.findAllById(authorIds)
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return notices.stream()
            .map(notice -> AdminNoticeResponse.of(
                notice,
                nameMap.getOrDefault(notice.getAuthorId(), "(알 수 없음)")
            ))
            .toList();

    }

    @Override
    public WriteNoticeResponse writeNotice(String userId, WriteNoticeRequest request) {
        User user = findUserByUserId(userId);
        Notice notice = Notice.builder()
            .title(request.title())
            .content(request.content())
            .authorId(user.getId())
            .build();

        noticeRepository.save(notice);

        return new WriteNoticeResponse("message");
    }

    @Override
    public UpdateNoticeResponse updateNotice(Long noticeId, UpdateNoticeRequest request) {
        Notice notice = findNoticeByIdOrThrow(noticeId);
        notice.update(request.title(), request.content());
        noticeRepository.save(notice);

        return new UpdateNoticeResponse("success");
    }

    @Override
    public void deleteNotice(Long noticeId) {
        Notice notice = findNoticeByIdOrThrow(noticeId);
        noticeRepository.deleteById(notice.getId());
    }


    // ======== 메서드 ======== //
    // 1. (String userId) -> User 조회
    private User findUserByUserId(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(()-> new UserException(UserErrorCode.USER_NOT_FOUND_BY_ID));
    }

    // 2. noticeId -> Notice 조회
    private Notice findNoticeByIdOrThrow(Long noticeId){
        return noticeRepository.findById(noticeId)
            .orElseThrow(()-> new CustomerCenterException(CustomerCenterErrorCode.NOTICE_NOT_FOUND));
    }
}
