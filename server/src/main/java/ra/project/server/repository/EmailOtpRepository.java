package ra.project.server.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ra.project.server.model.entity.EmailOtp;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {

    Optional<EmailOtp> findTopByEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    List<EmailOtp> findAllByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}

