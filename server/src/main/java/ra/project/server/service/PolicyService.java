package ra.project.server.service;

import org.springframework.data.domain.Pageable;
import ra.project.server.common.response.PageResponse;
import ra.project.server.model.entity.Policy;

import java.util.List;

public interface PolicyService {

    List<Policy> getPublicPolicies();

    Policy getPublicPolicyBySlug(String slug);

    PageResponse<Policy> searchAdminPolicies(String keyword, String category, Boolean isActive, Pageable pageable);

    Policy getPolicyById(Long id);

    Policy createPolicy(Policy request);

    Policy updatePolicy(Long id, Policy request);

    Policy togglePolicyStatus(Long id, Boolean isActive);

    void deletePolicy(Long id);
}

