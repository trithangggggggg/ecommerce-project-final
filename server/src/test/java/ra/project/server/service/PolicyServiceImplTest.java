package ra.project.server.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ra.project.server.exception.BadRequestException;
import ra.project.server.exception.ResourceNotFoundException;
import ra.project.server.model.entity.Policy;
import ra.project.server.repository.PolicyRepository;
import ra.project.server.service.impl.PolicyServiceImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test: PolicyServiceImpl")
class PolicyServiceImplTest {

    @Mock
    private PolicyRepository policyRepository;

    @InjectMocks
    private PolicyServiceImpl policyService;

    @Test
    @DisplayName("createPolicy tự tạo slug và chuẩn hóa category")
    void createPolicy_success() {
        when(policyRepository.existsBySlugIgnoreCase("chinh-sach-bao-hanh")).thenReturn(false);
        when(policyRepository.save(any(Policy.class))).thenAnswer(inv -> {
            Policy p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        Policy created = policyService.createPolicy(Policy.builder()
                .title("Chính sách bảo hành")
                .category("warranty")
                .content("<p>Bảo hành 24 tháng</p>")
                .build());

        assertEquals("chinh-sach-bao-hanh", created.getSlug());
        assertEquals("WARRANTY", created.getCategory());
        assertTrue(created.getIsActive());
    }

    @Test
    @DisplayName("createPolicy báo lỗi khi thiếu tiêu đề")
    void createPolicy_blankTitle_throwsBadRequest() {
        assertThrows(BadRequestException.class, () ->
                policyService.createPolicy(Policy.builder().title("  ").build()));
    }

    @Test
    @DisplayName("getPublicPolicyBySlug & togglePolicyStatus hoạt động đúng")
    void getBySlugAndToggle_success() {
        Policy policy = Policy.builder().id(3L).title("Đổi trả 30 ngày").slug("doi-tra-30-ngay").isActive(true).build();
        when(policyRepository.findBySlugIgnoreCaseAndIsActiveTrue("doi-tra-30-ngay")).thenReturn(Optional.of(policy));
        when(policyRepository.findById(3L)).thenReturn(Optional.of(policy));
        when(policyRepository.save(any(Policy.class))).thenAnswer(inv -> inv.getArgument(0));

        assertEquals("Đổi trả 30 ngày", policyService.getPublicPolicyBySlug("doi-tra-30-ngay").getTitle());
        assertFalse(policyService.togglePolicyStatus(3L, false).getIsActive());
    }

    @Test
    @DisplayName("getPublicPolicyBySlug báo lỗi khi slug không tồn tại")
    void getPublicPolicyBySlug_notFound() {
        when(policyRepository.findBySlugIgnoreCaseAndIsActiveTrue("unknown")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> policyService.getPublicPolicyBySlug("unknown"));
    }
}

