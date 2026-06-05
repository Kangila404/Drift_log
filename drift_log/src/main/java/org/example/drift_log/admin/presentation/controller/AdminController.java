package org.example.drift_log.admin.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.example.drift_log.admin.application.AdminService;
import org.example.drift_log.admin.presentation.dto.req.UpdateVersionRequest;
import org.example.drift_log.admin.presentation.dto.res.AdminDashboardResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserDetailResponse;
import org.example.drift_log.admin.presentation.dto.res.AdminUserResponse;
import org.example.drift_log.admin.presentation.dto.res.UpdateVersionResponse;
import org.example.drift_log.admin.presentation.dto.res.VersionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "관리자 관련 api")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;


    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard(){
        AdminDashboardResponse response = adminService.getDashboard();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user")
    public ResponseEntity<List<AdminUserResponse>> getUser(){
        List<AdminUserResponse> responses = adminService.getUserList();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<AdminUserDetailResponse> getUserDetail(@PathVariable String userId){
        AdminUserDetailResponse response = adminService.getUserDetail(userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/user/{userId}/ban")
    public ResponseEntity<Void> banUser(@PathVariable String userId) {
        adminService.banUser(userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/user/{userId}/activation")
    public ResponseEntity<Void> activateUser(@PathVariable String userId) {
        adminService.activateUser(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/version")
    public ResponseEntity<VersionResponse> getVersion(){
        VersionResponse response = adminService.getVersion();
        return ResponseEntity.ok(response);
    }




}
