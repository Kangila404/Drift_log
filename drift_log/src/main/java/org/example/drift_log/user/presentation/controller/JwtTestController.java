package org.example.drift_log.user.presentation.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class JwtTestController {

    @GetMapping
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("토큰 인증 성공!");
    }

}
