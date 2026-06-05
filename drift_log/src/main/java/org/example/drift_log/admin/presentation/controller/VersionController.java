package org.example.drift_log.admin.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.admin.application.AdminService;
import org.example.drift_log.admin.presentation.dto.res.VersionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RestController;

@Tag(name = "개발 버전 조회 API")
@RestController
@RequiredArgsConstructor
public class VersionController {

    private final AdminService adminService;



    @GetMapping("/api/version")
    public ResponseEntity<VersionResponse> getVersion(){
        VersionResponse response = adminService.getVersion();
        return ResponseEntity.ok(response);
    }

}
