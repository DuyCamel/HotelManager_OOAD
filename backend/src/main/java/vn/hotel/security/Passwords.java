package vn.hotel.security;

/** Băm mật khẩu PBKDF2, salt ngẫu nhiên cho từng tài khoản. */
import java.security.*;
import java.util.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
public final class Passwords {
    private Passwords() {}
    public static String hash(String password) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt) + ":" + derive(password, salt);
    }
    private static String derive(String p, byte[] salt) {
        try {
            var spec = new PBEKeySpec(p.toCharArray(), salt, 120000, 256);
            try {
                return Base64.getEncoder().encodeToString(
                    SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());
            } finally {
                spec.clearPassword();
            }
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
    public static boolean matches(String password, String hash) {
        try {
            String[] p = hash.split(":");
            return MessageDigest.isEqual(derive(password, Base64.getDecoder().decode(p[0]))
                                             .getBytes(java.nio.charset.StandardCharsets.UTF_8),
                p[1].getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }
    }
}
