package org.example.drift_log.study.presentation.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.study.application.StudyTimeService;
import org.example.drift_log.study.presentation.dto.req.StudyTimeUpdateRequest;
import org.example.drift_log.study.presentation.dto.res.StudyTimeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/study/logs")
public class StudyLogController {

    private final StudyTimeService studyTimeService;

    // 목록 조회
    @GetMapping
    public ResponseEntity<List<StudyTimeResponse>> getLogs(
        @AuthenticationPrincipal String userId
    ){
        return ResponseEntity.ok(studyTimeService.getLogs(userId));
    }

    // 공부 내용 수정
    @PatchMapping("/{id}")
    public ResponseEntity<StudyTimeResponse> updateSubject(
        @AuthenticationPrincipal String userId,
        @PathVariable Long id,
        @RequestBody StudyTimeUpdateRequest request
    ){
        return ResponseEntity.ok(studyTimeService.updateSubject(userId, id, request.subject()));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
        @AuthenticationPrincipal String userId,
        @PathVariable Long id
    ){
        studyTimeService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}