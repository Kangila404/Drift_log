package org.example.drift_log.voyage.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.voyage.application.VoyageLogService;
import org.example.drift_log.voyage.presentation.dto.req.WriteVoyageLogRequest;
import org.example.drift_log.voyage.presentation.dto.res.VoyageLogResponse;
import org.example.drift_log.voyage.presentation.dto.res.WriteVoyageLogResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "항해 기록 기록 관련 컨트롤러")
@RestController
@RequestMapping("/api/voyage-log")
@RequiredArgsConstructor
public class VoyageLogController {

    private final VoyageLogService voyageLogService;

    @GetMapping
    public ResponseEntity<List<VoyageLogResponse>> getLogs(
        @AuthenticationPrincipal String userId
    ){
        List<VoyageLogResponse> response = voyageLogService.getLogList(userId);

        return  ResponseEntity.ok(response);
    }

    @PostMapping("{logId}")
    public ResponseEntity<WriteVoyageLogResponse> writeLog(
        @AuthenticationPrincipal String userId,
        @PathVariable Long logId,
        @Valid @RequestBody WriteVoyageLogRequest request){
        WriteVoyageLogResponse response = voyageLogService.writeLog(userId,logId, request);
        return  ResponseEntity.ok(response);
    }

}
