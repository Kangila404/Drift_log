package org.example.drift_log.customerCenter.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.application.AdminNoticeService;
import org.example.drift_log.customerCenter.presentation.dto.req.UpdateNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.req.WriteNoticeRequest;
import org.example.drift_log.customerCenter.presentation.dto.res.AdminNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.UpdateNoticeResponse;
import org.example.drift_log.customerCenter.presentation.dto.res.WriteNoticeResponse;
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

@Tag(name = "관리자 게시판 관리 API")
@RestController
@RequestMapping("/api/admin/notice")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final AdminNoticeService adminNoticeService;

    // 1. 모든 공지 사항 조회
    @GetMapping
    public ResponseEntity<List<AdminNoticeResponse>> getNotices(
    ){
        List<AdminNoticeResponse> response = adminNoticeService.getNotices();
        return ResponseEntity.ok(response);
    }

    // 2. 공지사항 작성
    @PostMapping
    public ResponseEntity<WriteNoticeResponse> writeNotice(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody WriteNoticeRequest request
    ){
        WriteNoticeResponse response = adminNoticeService.writeNotice(userId, request);
        return ResponseEntity.ok(response);
    }

    // 3. 공지사항 수정
    @PatchMapping("/{noticeId}")
    public ResponseEntity<UpdateNoticeResponse> updateNotice(
        @PathVariable Long noticeId,
        @Valid @RequestBody UpdateNoticeRequest request
    ){
        UpdateNoticeResponse response = adminNoticeService.updateNotice(noticeId, request);
        return ResponseEntity.ok(response);
    }

    // 4. 공지사항 삭제
    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Void> deleteNotice(
        @PathVariable Long noticeId){
        adminNoticeService.deleteNotice(noticeId);
        return ResponseEntity.ok().build();
    }



}
