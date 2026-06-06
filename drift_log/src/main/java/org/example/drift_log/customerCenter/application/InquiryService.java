package org.example.drift_log.customerCenter.application;

import java.util.List;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateInquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteInquiryResponse;

public interface InquiryService {

    List<InquiryResponse> findAllInquiries();

    WriteInquiryResponse writeInquiry(String userId, WriteInquiryRequest request);

    List<InquiryResponse> getInquiries(String userId);

    UpdateInquiryResponse updateInquiry(String userId, Long inquiryId, UpdateInquiryRequest request);

    void deleteInquiry(String userId, Long inquiryId);
}
