import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as linkedinSubCookie from '@/lib/utils/linkedin-sub-cookie';
import * as enrichProfile from '@/lib/utils/enrich-profile';
import * as supabaseServer from '@/lib/supabase/server';

// Set Supabase environment variables before any imports that use them
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock dependencies
vi.mock('@/lib/utils/linkedin-sub-cookie');
vi.mock('@/lib/utils/enrich-profile');
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

// Import routes after mocks are set up
import { GET as v1CallbackGET } from '@/app/auth/v1/callback/route';
import { GET as magicLinkCallbackGET } from '@/app/auth/callback/route';
import { GET as linkIdentityGET } from '@/app/api/auth/link-identity/route';

describe('LinkedIn OAuth Flow - No Verified Email Scenario', () => {
  const testLinkedInSub = 'linkedin-user-12345';
  const testEmail = 'user@example.com';
  const testUserId = 'supabase-user-123';
  
  let mockSupabaseClient: any;
  let mockUser: any;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock user
    mockUser = {
      id: testUserId,
      email: testEmail,
      email_confirmed_at: new Date().toISOString(),
      identities: [],
      user_metadata: {},
    };

    // Setup mock session
    mockSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      user: mockUser,
    };

    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
        exchangeCodeForSession: vi.fn(),
        linkIdentity: vi.fn(),
        signInWithOAuth: vi.fn(),
      },
    };

    vi.mocked(supabaseServer.createServerClient).mockResolvedValue(mockSupabaseClient as any);
  });

  describe('Step 1: LinkedIn OAuth - No Verified Email', () => {
    it('should store LinkedIn sub when email is not verified', async () => {
      // Simulate LinkedIn OAuth callback with no verified email
      const linkedinUser = {
        id: testUserId,
        email: null, // No email
        identities: [
          {
            id: testLinkedInSub,
            provider: 'linkedin_oidc',
          },
        ],
        user_metadata: {
          sub: testLinkedInSub,
          email_verified: false,
        },
      };

      const linkedinSession = {
        ...mockSession,
        user: linkedinUser,
      };

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: linkedinSession },
        error: null,
      });

      vi.mocked(linkedinSubCookie.storeLinkedInSub).mockResolvedValue();

      const request = new NextRequest(
        `http://localhost/auth/v1/callback?code=linkedin-oauth-code`
      );

      const response = await v1CallbackGET(request);

      // Should store the LinkedIn sub
      expect(linkedinSubCookie.storeLinkedInSub).toHaveBeenCalledWith(testLinkedInSub);

      // Should redirect to auth page with error
      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('/auth?error=linkedin_no_email');
    });
  });

  describe('Step 2: Magic Link Authentication', () => {
    it('should authenticate user via magic link and redirect to dashboard', async () => {
      // Simulate magic link callback
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost/auth/callback?code=magic-link-code`
      );

      const response = await magicLinkCallbackGET(request);

      // Should exchange code for session
      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('magic-link-code');

      // Should redirect to dashboard
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/dashboard');
    });
  });

  describe('Step 3: Link Identity with Stored Sub', () => {
    it('should use stored LinkedIn sub when linking identity', async () => {
      // User is authenticated via magic link
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Stored LinkedIn sub exists
      vi.mocked(linkedinSubCookie.getLinkedInSub).mockResolvedValue(testLinkedInSub);

      // Mock linkIdentity response
      const oauthUrl = 'https://linkedin.com/oauth/authorize?client_id=...';
      mockSupabaseClient.auth.linkIdentity.mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/auth/link-identity');

      const response = await linkIdentityGET(request);

      // Should check for stored sub (this would happen in the callback)
      // The linkIdentity route initiates the OAuth flow
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
      expect(mockSupabaseClient.auth.linkIdentity).toHaveBeenCalledWith({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: expect.stringContaining('/auth/v1/callback?link=true'),
        },
      });

      // Should return OAuth URL
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.url).toBe(oauthUrl);
    });

    it('should handle linkIdentity callback with stored sub', async () => {
      // Simulate user clicking "Connect LinkedIn" after magic link auth
      // User is authenticated
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // LinkedIn OAuth callback with link=true
      const linkedinUserWithEmail = {
        id: testUserId,
        email: testEmail,
        identities: [
          {
            id: testLinkedInSub,
            provider: 'linkedin_oidc',
          },
        ],
        user_metadata: {
          sub: testLinkedInSub,
          email: testEmail,
          email_verified: true,
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
          picture: 'https://example.com/avatar.jpg',
        },
      };

      const linkedinSession = {
        ...mockSession,
        user: linkedinUserWithEmail,
      };

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: linkedinSession },
        error: null,
      });

      // Stored sub exists and should be used
      vi.mocked(linkedinSubCookie.getLinkedInSub).mockResolvedValue(testLinkedInSub);
      vi.mocked(linkedinSubCookie.markLinkedInSubAsUsed).mockResolvedValue();
      vi.mocked(enrichProfile.enrichProfileFromLinkedIn).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/auth/v1/callback?code=linkedin-oauth-code&link=true`
      );

      const response = await v1CallbackGET(request);

      // Should enrich profile with LinkedIn data
      expect(enrichProfile.enrichProfileFromLinkedIn).toHaveBeenCalledWith(
        testUserId,
        expect.objectContaining({
          sub: testLinkedInSub,
          email: testEmail,
          email_verified: testEmail, // email_verified is set to email value when verified
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
          picture: 'https://example.com/avatar.jpg',
        }),
        expect.any(Object) // supabaseClient
      );

      // Should mark stored sub as used
      expect(linkedinSubCookie.markLinkedInSubAsUsed).toHaveBeenCalled();

      // Should redirect to dashboard with success
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/dashboard?linked=success');
    });
  });

  describe('Complete Flow Integration', () => {
    it('should complete full flow: LinkedIn OAuth -> No Email -> Magic Link -> Link Identity', async () => {
      // Step 1: LinkedIn OAuth returns no verified email
      const linkedinUserNoEmail = {
        id: 'temp-user-id',
        email: null,
        identities: [
          {
            id: testLinkedInSub,
            provider: 'linkedin_oidc',
          },
        ],
        user_metadata: {
          sub: testLinkedInSub,
          email_verified: false,
        },
      };

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: { ...mockSession, user: linkedinUserNoEmail } },
        error: null,
      });

      vi.mocked(linkedinSubCookie.storeLinkedInSub).mockResolvedValue();

      const linkedinRequest = new NextRequest(
        `http://localhost/auth/v1/callback?code=linkedin-code`
      );

      const linkedinResponse = await v1CallbackGET(linkedinRequest);

      // Verify sub is stored
      expect(linkedinSubCookie.storeLinkedInSub).toHaveBeenCalledWith(testLinkedInSub);
      expect(linkedinResponse.status).toBe(307);

      // Step 2: User authenticates via magic link
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const magicLinkRequest = new NextRequest(
        `http://localhost/auth/callback?code=magic-link-code`
      );

      const magicLinkResponse = await magicLinkCallbackGET(magicLinkRequest);

      // Verify redirect to dashboard
      expect(magicLinkResponse.status).toBe(307);
      const magicLinkLocation = magicLinkResponse.headers.get('location');
      expect(magicLinkLocation).toContain('/dashboard');

      // Step 3: User clicks "Connect LinkedIn" - stored sub is retrieved
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      vi.mocked(linkedinSubCookie.getLinkedInSub).mockResolvedValue(testLinkedInSub);

      const oauthUrl = 'https://linkedin.com/oauth/authorize';
      mockSupabaseClient.auth.linkIdentity.mockResolvedValue({
        data: { url: oauthUrl },
        error: null,
      });

      const linkIdentityRequest = new NextRequest('http://localhost/api/auth/link-identity');
      const linkIdentityResponse = await linkIdentityGET(linkIdentityRequest);

      expect(linkIdentityResponse.status).toBe(200);
      const linkIdentityData = await linkIdentityResponse.json();
      expect(linkIdentityData.url).toBe(oauthUrl);

      // Step 4: LinkedIn OAuth callback with link=true - stored sub is used
      const linkedinUserWithEmail = {
        ...mockUser,
        identities: [
          ...mockUser.identities,
          {
            id: testLinkedInSub,
            provider: 'linkedin_oidc',
          },
        ],
        user_metadata: {
          sub: testLinkedInSub,
          email: testEmail,
          email_verified: true,
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
        },
      };

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValueOnce({
        data: { session: { ...mockSession, user: linkedinUserWithEmail } },
        error: null,
      });

      vi.mocked(enrichProfile.enrichProfileFromLinkedIn).mockResolvedValue([]);
      vi.mocked(linkedinSubCookie.markLinkedInSubAsUsed).mockResolvedValue();

      const finalCallbackRequest = new NextRequest(
        `http://localhost/auth/v1/callback?code=final-linkedin-code&link=true`
      );

      const finalCallbackResponse = await v1CallbackGET(finalCallbackRequest);

      // Verify profile enrichment and sub cleanup
      expect(enrichProfile.enrichProfileFromLinkedIn).toHaveBeenCalled();
      expect(linkedinSubCookie.markLinkedInSubAsUsed).toHaveBeenCalled();

      // Verify success redirect
      expect(finalCallbackResponse.status).toBe(307);
      const finalLocation = finalCallbackResponse.headers.get('location');
      expect(finalLocation).toContain('/dashboard?linked=success');
    });
  });
});

