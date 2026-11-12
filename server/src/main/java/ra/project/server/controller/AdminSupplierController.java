package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Supplier;
import ra.project.server.repository.SupplierRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/suppliers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminSupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Supplier>>> getAllSuppliers(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "status", required = false) String status
    ) {
        String cleanKeyword = StringUtils.hasText(keyword) ? keyword.trim() : null;
        String cleanStatus = (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status.trim()))
                ? status.trim().toUpperCase()
                : null;
        List<Supplier> list = (cleanKeyword == null && cleanStatus == null)
                ? supplierRepository.findAll()
                : supplierRepository.searchSuppliers(cleanKeyword, cleanStatus);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhà cung cấp thành công", list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Supplier>> getSupplierById(@PathVariable Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", id));
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết nhà cung cấp thành công", supplier));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Supplier>> createSupplier(@RequestBody Supplier request) {
        String normalizedCode = validateAndNormalizeCode(request.getCode());
        String normalizedName = validateAndNormalizeName(request.getName());
        if (supplierRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new BadRequestException("Mã nhà cung cấp '" + normalizedCode + "' đã tồn tại!");
        }

        Supplier supplier = Supplier.builder()
                .code(normalizedCode)
                .name(normalizedName)
                .brand(trimOrNull(request.getBrand()))
                .contact(trimOrNull(request.getContact()))
                .email(trimOrNull(request.getEmail()))
                .address(trimOrNull(request.getAddress()))
                .status(normalizeStatus(request.getStatus()))
                .build();
        Supplier saved = supplierRepository.save(supplier);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Thêm nhà cung cấp thành công", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Supplier>> updateSupplier(
            @PathVariable Long id,
            @RequestBody Supplier request
    ) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", id));

        String normalizedCode = validateAndNormalizeCode(request.getCode());
        String normalizedName = validateAndNormalizeName(request.getName());
        if (supplierRepository.existsByCodeIgnoreCaseAndIdNot(normalizedCode, id)) {
            throw new BadRequestException("Mã nhà cung cấp '" + normalizedCode + "' đã được sử dụng bởi đối tác khác!");
        }

        existing.setCode(normalizedCode);
        existing.setName(normalizedName);
        existing.setBrand(trimOrNull(request.getBrand()));
        existing.setContact(trimOrNull(request.getContact()));
        existing.setEmail(trimOrNull(request.getEmail()));
        existing.setAddress(trimOrNull(request.getAddress()));
        if (StringUtils.hasText(request.getStatus())) {
            existing.setStatus(normalizeStatus(request.getStatus()));
        }

        Supplier updated = supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhà cung cấp thành công", updated));
    }

    @PatchMapping(value = {"/{id}/status", "/{id}/toggle-status"})
    @PutMapping(value = {"/{id}/status", "/{id}/toggle-status"})
    public ResponseEntity<ApiResponse<Supplier>> toggleSupplierStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(name = "status", required = false) String statusParam
    ) {
        Supplier existing = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhà cung cấp", "id", id));

        String requestedStatus = statusParam;
        if (requestedStatus == null && body != null && body.get("status") != null) {
            requestedStatus = body.get("status").toString();
        }
        String nextStatus = StringUtils.hasText(requestedStatus)
                ? normalizeStatus(requestedStatus)
                : ("ACTIVE".equalsIgnoreCase(existing.getStatus()) ? "INACTIVE" : "ACTIVE");

        existing.setStatus(nextStatus);
        Supplier saved = supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật trạng thái đối tác thành " + nextStatus, saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Nhà cung cấp", "id", id);
        }
        supplierRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà cung cấp thành công", null));
    }

    private String validateAndNormalizeCode(String code) {
        if (!StringUtils.hasText(code)) {
            throw new BadRequestException("Mã nhà cung cấp không được để trống!");
        }
        return code.trim().toUpperCase();
    }

    private String validateAndNormalizeName(String name) {
        if (!StringUtils.hasText(name)) {
            throw new BadRequestException("Tên nhà cung cấp không được để trống!");
        }
        return name.trim();
    }

    private String normalizeStatus(String status) {
        if (!StringUtils.hasText(status)) {
            return "ACTIVE";
        }
        return "INACTIVE".equalsIgnoreCase(status.trim()) || "false".equalsIgnoreCase(status.trim())
                ? "INACTIVE"
                : "ACTIVE";
    }

    private String trimOrNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
