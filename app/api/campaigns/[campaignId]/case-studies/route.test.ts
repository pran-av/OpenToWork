import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import * as campaignsDb from '@/lib/db/campaigns';
import * as projectsDb from '@/lib/db/projects';

// Mock the database functions
vi.mock('@/lib/db/campaigns', () => ({
  createCaseStudy: vi.fn(),
  updateCaseStudy: vi.fn(),
  deleteCaseStudy: vi.fn(),
  getCampaignById: vi.fn(),
}));

vi.mock('@/lib/db/projects', () => ({
  getProjectById: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
  })),
}));

describe('Case Studies API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(campaignsDb.getCampaignById).mockResolvedValue({
      campaign_id: 'test-campaign-id',
      campaign_status: 'DRAFT',
      project_id: 'test-project-id',
    } as any);
    
    vi.mocked(projectsDb.getProjectById).mockResolvedValue({
      is_archived: false,
    } as any);
  });

  describe('Temp UUID Validation', () => {
    it('should reject case study creation with temp service ID', async () => {
      const request = new NextRequest('http://localhost/api/campaigns/test-campaign-id/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'create',
              tempId: 'temp-case-123',
              serviceId: 'temp-1767518731078', // Temp ID
              data: {
                case_name: 'Test Case',
                case_highlights: 'Test highlights',
              },
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: 'test-campaign-id' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid service ID');
      expect(data.error).toContain('temporary ID');
      expect(campaignsDb.createCaseStudy).not.toHaveBeenCalled();
    });

    it('should accept case study creation with valid UUID service ID', async () => {
      const validServiceId = '800779d0-0b02-4845-ac76-5842d64c3a41';
      
      vi.mocked(campaignsDb.createCaseStudy).mockResolvedValue({
        case_id: 'real-case-id',
        client_service_id: validServiceId,
        case_name: 'Test Case',
        case_highlights: 'Test highlights',
      } as any);

      const request = new NextRequest('http://localhost/api/campaigns/test-campaign-id/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'create',
              tempId: 'temp-case-123',
              serviceId: validServiceId, // Valid UUID
              data: {
                case_name: 'Test Case',
                case_highlights: 'Test highlights',
              },
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: 'test-campaign-id' }),
      });

      expect(response.status).toBe(200);
      expect(campaignsDb.createCaseStudy).toHaveBeenCalledWith(
        validServiceId,
        expect.objectContaining({
          case_name: 'Test Case',
          case_highlights: 'Test highlights',
        })
      );
    });

    it('should reject case study update with temp case ID', async () => {
      const request = new NextRequest('http://localhost/api/campaigns/test-campaign-id/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'update',
              caseId: 'temp-case-123', // Temp ID
              serviceId: '800779d0-0b02-4845-ac76-5842d64c3a41',
              data: {
                case_name: 'Updated Case',
              },
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: 'test-campaign-id' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid case study ID');
      expect(data.error).toContain('temporary ID');
      expect(campaignsDb.updateCaseStudy).not.toHaveBeenCalled();
    });

    it('should reject case study delete with temp case ID', async () => {
      const request = new NextRequest('http://localhost/api/campaigns/test-campaign-id/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'delete',
              caseId: 'temp-case-123', // Temp ID
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: 'test-campaign-id' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid case study ID');
      expect(data.error).toContain('temporary ID');
      expect(campaignsDb.deleteCaseStudy).not.toHaveBeenCalled();
    });

    it('should handle batch operations with mixed valid and invalid IDs', async () => {
      const validServiceId = '800779d0-0b02-4845-ac76-5842d64c3a41';
      const validCaseId = '800779d0-0b02-4845-ac76-5842d64c3a42';

      vi.mocked(campaignsDb.createCaseStudy).mockResolvedValue({
        case_id: validCaseId,
        client_service_id: validServiceId,
        case_name: 'Test Case',
        case_highlights: 'Test highlights',
      } as any);

      const request = new NextRequest('http://localhost/api/campaigns/test-campaign-id/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'create',
              tempId: 'temp-case-123',
              serviceId: 'temp-1767518731078', // Temp ID - should fail
              data: {
                case_name: 'Test Case',
                case_highlights: 'Test highlights',
              },
            },
            {
              type: 'create',
              tempId: 'temp-case-456',
              serviceId: validServiceId, // Valid UUID - should succeed
              data: {
                case_name: 'Test Case 2',
                case_highlights: 'Test highlights 2',
              },
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: 'test-campaign-id' }),
      });

      // Should fail on first operation with temp ID
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid service ID');
      expect(data.error).toContain('temp-1767518731078');
      // Should not process second operation
      expect(campaignsDb.createCaseStudy).not.toHaveBeenCalled();
    });
  });

  describe('Original Bug Scenario', () => {
    it('should replicate the original error scenario', async () => {
      // This replicates the exact payload from the bug report
      // Note: The route expects { operations: [...] } format
      const request = new NextRequest('http://localhost/api/campaigns/800779d0-0b02-4845-ac76-5842d64c3a41/case-studies', {
        method: 'POST',
        body: JSON.stringify({
          operations: [
            {
              type: 'create',
              tempId: 'temp-case-1767518732889',
              serviceId: 'temp-1767518731078', // This is the problematic temp ID
              data: {
                case_id: 'temp-case-1767518732889',
                client_service_id: 'temp-1767518731078',
                case_name: 'Case',
                case_summary: 'Cs',
                case_duration: '',
                case_highlights: 'H1',
                case_study_url: '',
              },
            },
          ],
        }),
      });

      const response = await POST(request, {
        params: Promise.resolve({ campaignId: '800779d0-0b02-4845-ac76-5842d64c3a41' }),
      });

      // Should now reject with clear error instead of database error
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid service ID');
      expect(data.error).toContain('temp-1767518731078');
      expect(data.error).toContain('temporary ID');
      
      // Should not attempt database operation
      expect(campaignsDb.createCaseStudy).not.toHaveBeenCalled();
    });
  });
});

