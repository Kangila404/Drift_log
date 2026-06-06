package org.example.drift_log.customerCenter.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.application.InquiryService;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteInquiryRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.InquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateInquiryResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteInquiryResponse;
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

@Tag(name = "고객 문의 API")
@RestController
@RequestMapping("/api/inquiry")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    // 1. 고객 문의글 작성
    @PostMapping
    public ResponseEntity<WriteInquiryResponse> writeInquiry(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody WriteInquiryRequest request
    ){
        WriteInquiryResponse response = inquiryService.writeInquiry(userId, request);
        return ResponseEntity.ok(response);
    }
    // 2. 고객 문의글 조회(자신 것만)
    @GetMapping
    public ResponseEntity<List<InquiryResponse>> getInquiry(
        @AuthenticationPrincipal String userId
    ){
        List<InquiryResponse> response = inquiryService.getInquiries(userId);
        return ResponseEntity.ok(response);
    }
    // 3. 고객 문의글 수정
    @PatchMapping("/{inquiryId}")
    public ResponseEntity<UpdateInquiryResponse> updateInquiry(
        @AuthenticationPrincipal String userId,
        @PathVariable Long inquiryId,
        @Valid @RequestBody UpdateInquiryRequest request
    ){
        UpdateInquiryResponse response = inquiryService.updateInquiry(userId, inquiryId, request);
        return ResponseEntity.ok(response);
    }
    // 4. 고객 문의글 삭제
    @DeleteMapping("/{inquiryId}")
    public ResponseEntity<Void> deleteInquiry(
        @AuthenticationPrincipal String userId,
        @PathVariable Long inquiryId
    ){
        inquiryService.deleteInquiry(userId, inquiryId);
        return ResponseEntity.ok().build();
    }
}
