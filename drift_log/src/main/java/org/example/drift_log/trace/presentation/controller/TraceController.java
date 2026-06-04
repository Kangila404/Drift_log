package org.example.drift_log.trace.presentation.controller;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.trace.application.DiscoverdTraceService;
import org.example.drift_log.trace.presentation.dto.res.DiscoveredTraceResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/trace")
public class TraceController {

    private final DiscoverdTraceService discoverdTraceService;

    @GetMapping
    public ResponseEntity<List<DiscoveredTraceResponse>> getdiscoveredTrace(
        @AuthenticationPrincipal String userId
    ){
        List<DiscoveredTraceResponse> response = discoverdTraceService.getDiscoveredTrace(userId);
        return ResponseEntity.ok(response);
    }

}
