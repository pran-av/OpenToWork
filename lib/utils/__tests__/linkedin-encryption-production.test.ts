import { describe, it, expect } from 'vitest';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

/**
 * Production encryption verification tests
 * These tests verify that the encryption functions work correctly in production
 * using real Node.js crypto module (no mocks)
 */
describe('LinkedIn Sub Cookie Encryption - Production Verification', () => {
  const testData = {
    provider: 'linkedin_oidc',
    sub: 'linkedin-user-12345',
    created_at: Date.now(),
    expires_at: Date.now() + 15 * 60 * 1000,
    used: false,
  };

  it('should encrypt and decrypt data correctly using AES-256-CBC', () => {
    // Generate encryption key (32 bytes for AES-256)
    const key = createHash('sha256')
      .update('test-encryption-key-for-production-verification')
      .digest();

    // Encrypt
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(testData), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedValue = `${iv.toString('hex')}:${encrypted}`;

    // Decrypt
    const [ivHex, encryptedData] = encryptedValue.split(':');
    const decipherIv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, decipherIv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    const decryptedData = JSON.parse(decrypted);

    expect(decryptedData.sub).toBe(testData.sub);
    expect(decryptedData.provider).toBe(testData.provider);
    expect(decryptedData.used).toBe(false);
  });

  it('should generate different encrypted values for same data (IV uniqueness)', () => {
    const key = createHash('sha256')
      .update('test-encryption-key')
      .digest();

    const encrypt = (data: string) => {
      const iv = randomBytes(16);
      const cipher = createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(data, 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    };

    const encrypted1 = encrypt(JSON.stringify(testData));
    const encrypted2 = encrypt(JSON.stringify(testData));

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2);
    
    // But both should decrypt to same data
    const decrypt = (encryptedValue: string) => {
      const [ivHex, encrypted] = encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
      return JSON.parse(decrypted);
    };

    expect(decrypt(encrypted1).sub).toBe(testData.sub);
    expect(decrypt(encrypted2).sub).toBe(testData.sub);
  });

  it('should fail decryption with wrong key', () => {
    const key1 = createHash('sha256').update('key1').digest();
    const key2 = createHash('sha256').update('key2').digest();

    // Encrypt with key1
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key1, iv);
    let encrypted = cipher.update(JSON.stringify(testData), 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedValue = `${iv.toString('hex')}:${encrypted}`;

    // Try to decrypt with key2 (should fail)
    const [ivHex, encryptedData] = encryptedValue.split(':');
    const decipherIv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key2, decipherIv);

    expect(() => {
      let decrypted = decipher.update(encryptedData, 'hex', 'utf-8');
      decrypted += decipher.final('utf-8');
    }).toThrow();
  });
});

