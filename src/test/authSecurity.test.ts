import { describe, expect, it } from 'vitest';
import { validatePasswordStrength } from '@/utils/passwordStrength';
import { hashPassword, verifyPassword, isHashed } from '../../electron/main/handlers/password-hash';

describe('Password Security & Hashing', () => {
  describe('validatePasswordStrength', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const res = validatePasswordStrength('Abc1!');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('كلمة المرور يجب أن تكون 8 أحرف أو أرقام على الأقل');
    });

    it('rejects passwords without letters', () => {
      const res = validatePasswordStrength('123456789');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('يجب أن تحتوي كلمة المرور على أحرف (عربية أو لاتينية)');
    });

    it('rejects passwords without digits', () => {
      const res = validatePasswordStrength('Abcdefghij');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
    });

    it('accepts valid password with letters and digits', () => {
      const res = validatePasswordStrength('User12345');
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(['fair', 'strong']).toContain(res.strength);
    });

    it('accepts Arabic characters and digits', () => {
      const res = validatePasswordStrength('كلمةسر123');
      expect(res.valid).toBe(true);
      expect(res.criteria.hasLetters).toBe(true);
      expect(res.criteria.hasDigits).toBe(true);
    });

    it('rates complex passwords as strong', () => {
      const res = validatePasswordStrength('SuperSecurePass123!@#');
      expect(res.valid).toBe(true);
      expect(res.strength).toBe('strong');
      expect(res.criteria.hasSpecial).toBe(true);
      expect(res.score).toBeGreaterThanOrEqual(4);
    });
  });

  describe('scrypt Password Hashing & Verification', () => {
    it('hashes a plain password to scrypt format', () => {
      const plain = 'MySecretPin123';
      const hash = hashPassword(plain);

      expect(typeof hash).toBe('string');
      expect(hash.startsWith('scrypt$')).toBe(true);
      expect(hash.split('$').length).toBe(3);
      expect(isHashed(hash)).toBe(true);
    });

    it('verifies a matching password against its scrypt hash', () => {
      const plain = 'CorrectPin1234';
      const hash = hashPassword(plain);

      expect(verifyPassword(plain, hash)).toBe(true);
    });

    it('rejects a wrong password against an scrypt hash', () => {
      const plain = 'CorrectPin1234';
      const hash = hashPassword(plain);

      expect(verifyPassword('WrongPin9999', hash)).toBe(false);
    });

    it('correctly distinguishes hashed vs plain text strings', () => {
      expect(isHashed('plainTextPassword123')).toBe(false);
      expect(isHashed('1234')).toBe(false);
      expect(isHashed('')).toBe(false);

      const realHash = hashPassword('test');
      expect(isHashed(realHash)).toBe(true);
    });

    it('supports backward compatibility for legacy plain-text stored passwords', () => {
      const legacyStored = 'legacyPlainPin';

      // Matches legacy plain text
      expect(verifyPassword('legacyPlainPin', legacyStored)).toBe(true);
      // Fails on mismatch
      expect(verifyPassword('wrongPlainPin', legacyStored)).toBe(false);
    });
  });
});
