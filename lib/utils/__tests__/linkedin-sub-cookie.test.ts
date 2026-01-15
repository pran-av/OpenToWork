import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cookies } from 'next/headers';
import {
  storeLinkedInSub,
  getLinkedInSub,
  markLinkedInSubAsUsed,
  deleteLinkedInSub,
} from '../linkedin-sub-cookie';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

// For testing, we'll use base64-encoded data to avoid crypto mocking complexity
// Production code still uses proper AES-256-CBC encryption

describe('LinkedIn Sub Cookie Utilities', () => {
  let mockCookieStore: any;
  const testSub = 'linkedin-user-123';

  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock cookie store
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };
    
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
    
    // Set development environment - use ENVIRONMENT variable (matches production setup)
    process.env.ENVIRONMENT = undefined as any;
    process.env.LINKEDIN_SUB_ENCRYPTION_KEY = undefined as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original environment
    process.env = { ...originalEnv };
  });

  describe('storeLinkedInSub', () => {
    it('should encrypt and store LinkedIn sub in cookie', async () => {
      await storeLinkedInSub(testSub);

      // Verify cookie is set with encrypted data (format: iv:encrypted)
      const setCall = mockCookieStore.set.mock.calls[0];
      expect(setCall[0]).toBe('linkedin_pending_sub');
      expect(setCall[1]).toMatch(/^[0-9a-f]{32}:[0-9a-f]+$/); // IV (32 hex chars) : encrypted data
      expect(setCall[2]).toMatchObject({
        httpOnly: true,
        secure: false, // Development mode
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60, // 15 minutes
      });
    });

    it('should use secure cookies in production', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.LINKEDIN_SUB_ENCRYPTION_KEY = 'test-production-key';
      
      await storeLinkedInSub(testSub);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'linkedin_pending_sub',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: true, // Production mode
          sameSite: 'lax',
        })
      );
    });

    it('should require encryption key in production', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.LINKEDIN_SUB_ENCRYPTION_KEY = undefined as any;

      await expect(storeLinkedInSub(testSub)).rejects.toThrow(
        'LINKEDIN_SUB_ENCRYPTION_KEY environment variable is required'
      );
    });

    it('should accept encryption key of any length (hashed to 32 bytes)', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.LINKEDIN_SUB_ENCRYPTION_KEY = 'any-length-key-will-work'; // Any length is fine

      await storeLinkedInSub(testSub);

      // Should work - key is hashed to 32 bytes internally
      expect(mockCookieStore.set).toHaveBeenCalled();
    });
  });

  describe('getLinkedInSub', () => {
    it('should return null if cookie does not exist', async () => {
      mockCookieStore.get.mockReturnValue(null);

      const result = await getLinkedInSub();

      expect(result).toBeNull();
    });

    it('should decrypt and return sub from valid cookie', async () => {
      // Create test data and encrypt it using real crypto (verifies encryption works)
      const testData = {
        provider: 'linkedin_oidc',
        sub: testSub,
        created_at: Date.now(),
        expires_at: Date.now() + 15 * 60 * 1000,
        used: false,
      };
      
      // Use real crypto to create properly encrypted test data
      const crypto = await import('crypto');
      const key = crypto.createHash('sha256')
        .update('dev-key-default-for-linkedin-sub-cookie-encryption')
        .digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(testData), 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const encryptedValue = `${iv.toString('hex')}:${encrypted}`;
      
      mockCookieStore.get.mockReturnValue({ value: encryptedValue });

      const result = await getLinkedInSub();

      expect(result).toBe(testSub);
    });

    it('should return null if cookie is expired', async () => {
      const expiredData = {
        provider: 'linkedin_oidc',
        sub: testSub,
        created_at: Date.now() - 20 * 60 * 1000, // 20 minutes ago
        expires_at: Date.now() - 5 * 60 * 1000, // Expired 5 minutes ago
        used: false,
      };
      
      // Use real crypto to encrypt expired data
      const crypto = await import('crypto');
      const key = crypto.createHash('sha256')
        .update('dev-key-default-for-linkedin-sub-cookie-encryption')
        .digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(expiredData), 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const encryptedValue = `${iv.toString('hex')}:${encrypted}`;
      
      mockCookieStore.get.mockReturnValue({ value: encryptedValue });

      const result = await getLinkedInSub();

      expect(result).toBeNull();
      expect(mockCookieStore.delete).toHaveBeenCalled();
    });

    it('should return null if cookie is already used', async () => {
      const usedData = {
        provider: 'linkedin_oidc',
        sub: testSub,
        created_at: Date.now(),
        expires_at: Date.now() + 15 * 60 * 1000,
        used: true,
      };
      
      // Use real crypto to encrypt used data
      const crypto = await import('crypto');
      const key = crypto.createHash('sha256')
        .update('dev-key-default-for-linkedin-sub-cookie-encryption')
        .digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(JSON.stringify(usedData), 'utf-8', 'hex');
      encrypted += cipher.final('hex');
      const encryptedValue = `${iv.toString('hex')}:${encrypted}`;
      
      mockCookieStore.get.mockReturnValue({ value: encryptedValue });

      const result = await getLinkedInSub();

      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', async () => {
      // Invalid encrypted data format (missing IV separator)
      mockCookieStore.get.mockReturnValue({ value: 'invalid-encrypted-data' });

      const result = await getLinkedInSub();

      expect(result).toBeNull();
      expect(mockCookieStore.delete).toHaveBeenCalled();
    });
  });

  describe('markLinkedInSubAsUsed', () => {
    it('should delete the cookie', async () => {
      await markLinkedInSubAsUsed();

      expect(mockCookieStore.delete).toHaveBeenCalledWith('linkedin_pending_sub');
    });
  });

  describe('deleteLinkedInSub', () => {
    it('should delete the cookie', async () => {
      await deleteLinkedInSub();

      expect(mockCookieStore.delete).toHaveBeenCalledWith('linkedin_pending_sub');
    });
  });
});

