package ra.project.server.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ra.project.server.model.entity.User;
import ra.project.server.repository.UserRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:123456}")
    private String adminPassword;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String clean = usernameOrEmail != null ? usernameOrEmail.trim() : "";
        String effectiveAdminUser = (adminUsername != null && !adminUsername.trim().isEmpty()) ? adminUsername.trim() : "admin";
        String effectiveAdminPass = (adminPassword != null && !adminPassword.trim().isEmpty()) ? adminPassword.trim() : "123456";

        // Nhận diện tài khoản Quản trị viên (xác thực trực tiếp từ GitHub Secrets / Environment, không qua Database)
        if (effectiveAdminUser.equalsIgnoreCase(clean) ||
            "admin".equalsIgnoreCase(clean) ||
            "admin@nexor.vn".equalsIgnoreCase(clean) ||
            "admin@eshop.com".equalsIgnoreCase(clean) ||
            "admin@eshoptech.vn".equalsIgnoreCase(clean) ||
            "admin@ecommerce.com".equalsIgnoreCase(clean)) {

            List<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ADMIN")
            );

            return CustomUserDetails.builder()
                    .id(0L)
                    .username(effectiveAdminUser)
                    .email("admin@nexor.vn")
                    .password(effectiveAdminPass.startsWith("$2a$") ? effectiveAdminPass : "{noop}" + effectiveAdminPass)
                    .active(true)
                    .authorities(authorities)
                    .build();
        }

        // Người dùng thông thường (Customer): truy vấn từ MySQL Database
        final String lookupKey = clean;
        User user = userRepository.findByUsernameIgnoreCase(lookupKey)
                .or(() -> userRepository.findByEmailIgnoreCase(lookupKey))
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy người dùng với tên đăng nhập hoặc email: " + lookupKey
                ));

        return CustomUserDetails.build(user);
    }
}
