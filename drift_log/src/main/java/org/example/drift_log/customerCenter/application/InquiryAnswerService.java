package org.example.drift_log.customerCenter.application;

import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerUpdateRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerUpdateResponse;

public interface InquiryAnswerService {

    InquiryAnswerResponse writeAnswer(Long inquiryId, String userId, InquiryAnswerRequest request);

    InquiryAnswerUpdateResponse updateAnswer(Long answerId, InquiryAnswerUpdateRequest request);

    void deleteAnswer(Long answerId);
}
