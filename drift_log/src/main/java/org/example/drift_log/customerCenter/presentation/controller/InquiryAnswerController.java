package org.example.drift_log.customerCenter.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.Table;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.application.InquiryAnswerService;
import org.example.drift_log.customerCenter.application.InquiryService;
import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.InquiryAnswerUpdateRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryAnswerUpdateResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 질문 답변 API")
@RestController
@RequestMapping("/api/admin/inquiry")
@RequiredArgsConstructor
public class InquiryAnswerController {

    private final InquiryAnswerService inquiryAnswerService;
    private final InquiryService inquiryService;

    @GetMapping
    public ResponseEntity<List<InquiryResponse>> getInquiries(){
        List<InquiryResponse> response = inquiryService.findAllInquiries();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{inquiryId}/answer")
    public ResponseEntity<InquiryAnswerResponse> writeAnswer(
        @PathVariable Long inquiryId,
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody InquiryAnswerRequest request
    ){
        InquiryAnswerResponse response = inquiryAnswerService.writeAnswer(inquiryId, userId, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{inquiryId}/answer")
    public ResponseEntity<InquiryAnswerUpdateResponse> updateAnswer(
        @PathVariable Long inquiryId,
        @Valid @RequestBody InquiryAnswerUpdateRequest request
    ){
        InquiryAnswerUpdateResponse response = inquiryAnswerService.updateAnswer(inquiryId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{inquiryId}/answer")
    public ResponseEntity<Void> deleteAnswer(@PathVariable Long inquiryId){
        inquiryAnswerService.deleteAnswer(inquiryId);
        return ResponseEntity.ok().build();
    }


}
