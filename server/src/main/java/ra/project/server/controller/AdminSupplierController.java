package ra.project.server.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ra.project.server.common.response.ApiResponse;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Supplier;
import ra.project.server.repository.SupplierRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin/suppliers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN') or hasAuthority('ADMIN')")
public class AdminSupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Supplier>>> getAllSuppliers() {
        List<Supplier> list = supplierRepository.findAll();
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
        if (supplierRepository.existsByCodeIgnoreCase(request.getCode())) {
            throw new IllegalArgumentException("Mã nhà cung cấp '" + request.getCode() + "' đã tồn tại!");
        }
        Supplier saved = supplierRepository.save(request);
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

        existing.setCode(request.getCode());
        existing.setName(request.getName());
        existing.setBrand(request.getBrand());
        existing.setContact(request.getContact());
        existing.setEmail(request.getEmail());
        existing.setAddress(request.getAddress());
        existing.setStatus(request.getStatus());

        Supplier updated = supplierRepository.save(existing);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhà cung cấp thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(@PathVariable Long id) {
        if (!supplierRepository.existsById(id)) {
            throw new ResourceNotFoundException("Nhà cung cấp", "id", id);
        }
        supplierRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa nhà cung cấp thành công", null));
    }
}
