package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.WheelSpinResponse;
import ra.project.server.model.dto.response.WheelStatusResponse;
import ra.project.server.service.WheelService;

@RestController
@RequestMapping("/api/wheel")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WheelController {

    private final WheelService wheelService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<WheelStatusResponse>> getStatus() {
        ApiResponse<WheelStatusResponse> response = wheelService.getWheelStatus();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/spin")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<WheelSpinResponse>> spin() {
        ApiResponse<WheelSpinResponse> response = wheelService.spinWheel();
        return ResponseEntity.ok(response);
    }
}

