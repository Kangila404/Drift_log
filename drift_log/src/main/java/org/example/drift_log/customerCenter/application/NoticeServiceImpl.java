package org.example.drift_log.customerCenter.application;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.domain.model.Notice;
import org.example.drift_log.customerCenter.domain.repository.NoticeRepository;
import org.example.drift_log.customerCenter.presentation.dto.res.NoticeResponse;
import org.example.drift_log.user.domain.model.User;
import org.example.drift_log.user.domain.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class NoticeServiceImpl implements NoticeService{

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly=true)
    @Override
    public List<NoticeResponse> getNotices() {
        List<Notice> notices = noticeRepository.findAll();

        List<Long> authorIds = notices.stream()
            .map(Notice::getAuthorId)
            .distinct()
            .toList();

        Map<Long,String> nameMap = userRepository.findAllById(authorIds)
            .stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return notices.stream()
            .map(notice -> NoticeResponse.of(
                notice,
                nameMap.getOrDefault(notice.getAuthorId(), "(알 수 없음)")
            ))
            .toList();
    }
}
