import { generateSlug, validateEmail, validatePassword } from '@/utils/auth';

describe('Auth Utils', () => {
  describe('generateSlug', () => {
    it('should convert name to lowercase slug', () => {
      expect(generateSlug('Acme Inc')).toBe('acme-inc');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('My Company Name')).toBe('my-company-name');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Acme & Co.')).toBe('acme-co');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Company   Name')).toBe('company-name');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(validateEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid password', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('password123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('PASSWORD123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject password without number', () => {
      const result = validatePassword('Password');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });
  });
});
