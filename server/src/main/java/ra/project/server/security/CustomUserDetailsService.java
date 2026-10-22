package ra.project.server.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.User;
import ra.project.server.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String clean = usernameOrEmail != null ? usernameOrEmail.trim() : "";

        // Hỗ trợ linh hoạt các biến thể email và username của Admin duy nhất
        if ("admin".equalsIgnoreCase(clean) ||
            "admin@nexor.vn".equalsIgnoreCase(clean) ||
            "admin@eshop.com".equalsIgnoreCase(clean) ||
            "admin@eshoptech.vn".equalsIgnoreCase(clean) ||
            "admin@ecommerce.com".equalsIgnoreCase(clean)) {
            clean = "admin";
        }

        final String lookupKey = clean;
        User user = userRepository.findByUsernameIgnoreCase(lookupKey)
                .or(() -> userRepository.findByEmailIgnoreCase(lookupKey))
                .or(() -> "admin".equalsIgnoreCase(lookupKey) ? userRepository.findByUsername("admin") : java.util.Optional.empty())
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy người dùng với tên đăng nhập hoặc email: " + lookupKey
                ));

        return CustomUserDetails.build(user);
    }
}
