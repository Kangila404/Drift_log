package org.example.drift_log.common.exception;

import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── DriftLog 도메인 예외 (모든 도메인 공통 처리) ──────────
    @ExceptionHandler(DriftLogException.class)
    public ResponseEntity<ErrorResponse> handleDriftLogException(DriftLogException e) {
        log.warn("[DriftLogException] status={}, message={}", e.getStatus(), e.getMessage());
        return ResponseEntity
            .status(e.getStatus())
            .body(ErrorResponse.of(e.getStatus().value(), e.getStatus().name(), e.getMessage()));
    }

    // ── Validation 실패 (@Valid) ────────────────────────────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
            .map(FieldError::getDefaultMessage)
            .collect(Collectors.joining(", "));
        log.warn("[ValidationException] {}", message);
        return ResponseEntity
            .badRequest()
            .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "INVALID_INPUT_VALUE", message));
    }

    // ── 타입 불일치 ─────────────────────────────────────────
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        log.warn("[TypeMismatch] param={}", e.getName());
        return ResponseEntity
            .badRequest()
            .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "INVALID_TYPE_VALUE", "잘못된 타입입니다."));
    }

    // ── 필수 파라미터 누락 ───────────────────────────────────
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException e) {
        log.warn("[MissingParam] param={}", e.getParameterName());
        return ResponseEntity
            .badRequest()
            .body(ErrorResponse.of(HttpStatus.BAD_REQUEST.value(), "MISSING_PARAMETER", "필수 파라미터가 누락되었습니다."));
    }

    // ── 404 ─────────────────────────────────────────────────
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoHandlerFoundException e) {
        log.warn("[NotFound] url={}", e.getRequestURL());
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse.of(HttpStatus.NOT_FOUND.value(), "RESOURCE_NOT_FOUND", "요청한 리소스를 찾을 수 없습니다."));
    }

    // ── 예상치 못한 예외 ─────────────────────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("[UnhandledException] {}", e.getMessage(), e);
        return ResponseEntity
            .internalServerError()
            .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR.value(), "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다."));
    }
}