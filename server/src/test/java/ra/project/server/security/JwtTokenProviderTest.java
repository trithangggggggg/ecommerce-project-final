package ra.project.server.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", 3600000L);
    }

    @Test
    void whenGenerateToken_thenTokenIsValidAndUsernameMatches() {
        String username = "customer1";
        String token = tokenProvider.generateTokenFromUsername(username);

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals(username, tokenProvider.getUsernameFromJwt(token));
    }

    @Test
    void whenInvalidToken_thenValidateTokenReturnsFalse() {
        String invalidToken = "invalid.jwt.token";
        assertFalse(tokenProvider.validateToken(invalidToken));
    }
}
