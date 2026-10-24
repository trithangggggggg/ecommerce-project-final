package ra.project.server.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ra.project.server.model.entity.User;
import ra.project.server.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String clean = StringUtils.hasText(usernameOrEmail) ? usernameOrEmail.trim() : "";

        User user = userRepository.findByUsernameIgnoreCase(clean)
                .or(() -> userRepository.findByEmailIgnoreCase(clean))
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy người dùng với tên đăng nhập hoặc email: " + clean
                ));

        return CustomUserDetails.build(user);
    }
}
