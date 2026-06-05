package org.example.drift_log.admin.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.admin.application.AdminService;
import org.example.drift_log.admin.presentation.dto.req.UpdateVersionRequest;
import org.example.drift_log.admin.presentation.dto.res.UpdateVersionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "개발 버전 조회 API")
@RestController
@RequiredArgsConstructor
public class VersionController {

    private final AdminService adminService;

    @PatchMapping("/api/version")
    public ResponseEntity<UpdateVersionResponse> updateVersion(@Valid @RequestBody UpdateVersionRequest request){
        UpdateVersionResponse response = adminService.updateVersion(request);
        return ResponseEntity.ok(response);
    }

}
