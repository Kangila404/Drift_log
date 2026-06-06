package org.example.drift_log.customerCenter.application;

import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.domain.model.Inquiry;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class InquiryAnswerServiceImpl implements InquiryAnswerService {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;

    // 1. 답변 등록
    @Override
    public InquiryAnswerResponse writeAnswer(Long inquiryId, String userId, InquiryAnswerRequest request) {
        User admin = findUserByUserIdOrThrow(userId);
        Inquiry inquiry = findInquiryByIdOrThrow(inquiryId);

        inquiry.answer(request.content(), admin.getId());

        return new InquiryAnswerResponse("success");
    }

    // 2. 답변 수정
    @Override
    public InquiryAnswerUpdateResponse updateAnswer(Long inquiryId, InquiryAnswerUpdateRequest request) {
        Inquiry inquiry = findInquiryByIdOrThrow(inquiryId);

        inquiry.updateAnswer(request.content());

        return new InquiryAnswerUpdateResponse("success");
    }

    // 3. 답변 삭제
    @Override
    public void deleteAnswer(Long inquiryId) {
        Inquiry inquiry = findInquiryByIdOrThrow(inquiryId);

        inquiry.deleteAnswer();
    }

    // ======== 메서드 ======== //
    private User findUserByUserIdOrThrow(String userId) {
        return userRepository.findByUserId(userId)
            .orElseThrow(() -> new UserException(UserErrorCode.USER_NOT_FOUND_BY_ID));
    }

    private Inquiry findInquiryByIdOrThrow(Long inquiryId) {
        return inquiryRepository.findById(inquiryId)
            .orElseThrow(() -> new CustomerCenterException(CustomerCenterErrorCode.INQUIRY_NOT_FOUND));
    }
}