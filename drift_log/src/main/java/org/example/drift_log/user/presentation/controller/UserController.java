package org.example.drift_log.user.presentation.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.drift_log.user.application.UserService;
import org.example.drift_log.user.presentation.dto.req.UpdateNameRequest;
import org.example.drift_log.user.presentation.dto.req.UpdatePasswordRequest;
import org.example.drift_log.user.presentation.dto.res.UserMeResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "유저 본인 정보 조회/수정 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> getMe(
        @AuthenticationPrincipal String userId
    ){
        UserMeResponse response = userService.getMe(userId);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/me")
    public ResponseEntity<Void> updateName(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody UpdateNameRequest request
    ){
        userService.updateName(userId, request);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/me/password")
    public ResponseEntity<Void> updatePassword(
        @AuthenticationPrincipal String userId,
        @Valid @RequestBody UpdatePasswordRequest request
    ){
        userService.updatePassword(userId, request);
        return ResponseEntity.ok().build();
    }
}
