package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.model.dto.response.FlashSaleResponse;
import ra.project.server.service.FlashSaleService;

import java.util.List;

@RestController
@RequestMapping("/api/flash-sales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FlashSaleController {

    private final FlashSaleService flashSaleService;

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<FlashSaleResponse>> getCurrentFlashSale() {
        FlashSaleResponse current = flashSaleService.getCurrentFlashSale();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin Flash Sale hiện tại thành công", current));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FlashSaleResponse>>> getPublicFlashSales() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách Flash Sale đang diễn ra thành công", flashSaleService.getPublicFlashSales()));
    }
}

