package org.example.drift_log.customerCenter.presentation.controller;


import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.customerCenter.application.NoticeService;
import org.example.drift_log.customerCenter.presentation.dto.res.NoticeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "일반 유저 공지사항 확인 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notice")
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public ResponseEntity<List<NoticeResponse>> getNotices(){
        List<NoticeResponse> response = noticeService.getNotices();
        return ResponseEntity.ok(response);
    }

}
