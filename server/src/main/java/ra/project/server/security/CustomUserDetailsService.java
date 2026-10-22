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

    @Value("${app.admin.username:}")
    private String adminUsername;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String clean = usernameOrEmail != null ? usernameOrEmail.trim() : "";
        String effectiveAdminUser = (adminUsername != null) ? adminUsername.trim() : "";
        String effectiveAdminPass = (adminPassword != null) ? adminPassword.trim() : "";

        // Nhận diện tài khoản Quản trị viên từ GitHub Secrets / Environment (KHÔNG lưu Database)
        if (!effectiveAdminUser.isEmpty() && effectiveAdminUser.equalsIgnoreCase(clean)) {
            List<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("ROLE_ADMIN"),
                    new SimpleGrantedAuthority("ADMIN")
            );

            // Tự động mã hóa BCrypt nếu cần để tương thích với BCryptPasswordEncoder
            String encodedAdminPass = effectiveAdminPass.startsWith("$2a$")
                    ? effectiveAdminPass
                    : new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode(effectiveAdminPass);

            String adminEmail = effectiveAdminUser.contains("@") ? effectiveAdminUser : effectiveAdminUser + "@nexor.vn";

            return CustomUserDetails.builder()
                    .id(0L)
                    .username(effectiveAdminUser)
                    .email(adminEmail)
                    .password(encodedAdminPass)
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
