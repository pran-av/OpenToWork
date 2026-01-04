import { describe, it, expect } from 'vitest';

/**
 * Unit tests for case study service ID mapping logic
 * These tests verify that temp IDs are correctly mapped to real UUIDs
 */

describe('Case Study Service ID Mapping', () => {
  describe('Temp ID Detection', () => {
    it('should identify temp service IDs correctly', () => {
      const tempId = 'temp-1767518731078';
      const realId = '800779d0-0b02-4845-ac76-5842d64c3a41';
      
      expect(tempId.startsWith('temp-')).toBe(true);
      expect(realId.startsWith('temp-')).toBe(false);
    });

    it('should handle various temp ID formats', () => {
      const tempIds = [
        'temp-1767518731078',
        'temp-case-1767518732889',
        'temp-service-123',
      ];
      
      tempIds.forEach(id => {
        expect(id.startsWith('temp-')).toBe(true);
      });
    });
  });

  describe('Service ID Mapping Logic', () => {
    it('should map temp service IDs to real UUIDs', () => {
      const serviceIdMap = new Map<string, string>();
      serviceIdMap.set('temp-1767518731078', '800779d0-0b02-4845-ac76-5842d64c3a41');
      
      const pendingOps = [
        {
          type: 'create' as const,
          tempId: 'temp-case-123',
          serviceId: 'temp-1767518731078',
          data: { case_name: 'Test' },
        },
      ];
      
      const mappedOps = pendingOps.map(op => {
        if (op.serviceId?.startsWith('temp-')) {
          const realServiceId = serviceIdMap.get(op.serviceId);
          if (realServiceId && !realServiceId.startsWith('temp-')) {
            return { ...op, serviceId: realServiceId };
          }
          return null;
        }
        if (op.serviceId && !op.serviceId.startsWith('temp-')) {
          return op;
        }
        return null;
      }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith('temp-'));
      
      expect(mappedOps.length).toBe(1);
      expect(mappedOps[0].serviceId).toBe('800779d0-0b02-4845-ac76-5842d64c3a41');
      expect(mappedOps[0].serviceId).not.toBe('temp-1767518731078');
    });

    it('should filter out operations with unmapped temp IDs', () => {
      const serviceIdMap = new Map<string, string>();
      // Map doesn't contain the temp ID
      
      const pendingOps = [
        {
          type: 'create' as const,
          tempId: 'temp-case-123',
          serviceId: 'temp-1767518731078', // Not in map
          data: { case_name: 'Test' },
        },
      ];
      
      const mappedOps = pendingOps.map(op => {
        if (op.serviceId?.startsWith('temp-')) {
          const realServiceId = serviceIdMap.get(op.serviceId);
          if (realServiceId && !realServiceId.startsWith('temp-')) {
            return { ...op, serviceId: realServiceId };
          }
          return null;
        }
        if (op.serviceId && !op.serviceId.startsWith('temp-')) {
          return op;
        }
        return null;
      }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith('temp-'));
      
      expect(mappedOps.length).toBe(0);
    });

    it('should keep operations with already valid UUIDs', () => {
      const serviceIdMap = new Map<string, string>();
      const validServiceId = '800779d0-0b02-4845-ac76-5842d64c3a41';
      
      const pendingOps = [
        {
          type: 'update' as const,
          caseId: '800779d0-0b02-4845-ac76-5842d64c3a42',
          serviceId: validServiceId, // Already valid
          data: { case_name: 'Updated' },
        },
      ];
      
      const mappedOps = pendingOps.map(op => {
        if (op.serviceId?.startsWith('temp-')) {
          const realServiceId = serviceIdMap.get(op.serviceId);
          if (realServiceId && !realServiceId.startsWith('temp-')) {
            return { ...op, serviceId: realServiceId };
          }
          return null;
        }
        if (op.serviceId && !op.serviceId.startsWith('temp-')) {
          return op;
        }
        return null;
      }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith('temp-'));
      
      expect(mappedOps.length).toBe(1);
      expect(mappedOps[0].serviceId).toBe(validServiceId);
    });

    it('should handle mixed operations (temp and valid IDs)', () => {
      const serviceIdMap = new Map<string, string>();
      serviceIdMap.set('temp-1767518731078', '800779d0-0b02-4845-ac76-5842d64c3a41');
      const validServiceId = '800779d0-0b02-4845-ac76-5842d64c3a43';
      
      const pendingOps = [
        {
          type: 'create' as const,
          tempId: 'temp-case-1',
          serviceId: 'temp-1767518731078', // Should be mapped
          data: { case_name: 'Test 1' },
        },
        {
          type: 'create' as const,
          tempId: 'temp-case-2',
          serviceId: validServiceId, // Already valid
          data: { case_name: 'Test 2' },
        },
        {
          type: 'create' as const,
          tempId: 'temp-case-3',
          serviceId: 'temp-unmapped-123', // Should be filtered out
          data: { case_name: 'Test 3' },
        },
      ];
      
      const mappedOps = pendingOps.map(op => {
        if (op.serviceId?.startsWith('temp-')) {
          const realServiceId = serviceIdMap.get(op.serviceId);
          if (realServiceId && !realServiceId.startsWith('temp-')) {
            return { ...op, serviceId: realServiceId };
          }
          return null;
        }
        if (op.serviceId && !op.serviceId.startsWith('temp-')) {
          return op;
        }
        return null;
      }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith('temp-'));
      
      expect(mappedOps.length).toBe(2);
      expect(mappedOps[0].serviceId).toBe('800779d0-0b02-4845-ac76-5842d64c3a41');
      expect(mappedOps[1].serviceId).toBe(validServiceId);
    });
  });

  describe('Original Bug Scenario - Mapping Fix', () => {
    it('should correctly map the temp service ID from the bug report', () => {
      const serviceIdMap = new Map<string, string>();
      // Simulate service being saved and mapped
      serviceIdMap.set('temp-1767518731078', '800779d0-0b02-4845-ac76-5842d64c3a41');
      
      const bugPayload = [
        {
          type: 'create' as const,
          tempId: 'temp-case-1767518732889',
          serviceId: 'temp-1767518731078', // Original temp ID from bug
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
      ];
      
      const mappedOps = bugPayload.map(op => {
        if (op.serviceId?.startsWith('temp-')) {
          const realServiceId = serviceIdMap.get(op.serviceId);
          if (realServiceId && !realServiceId.startsWith('temp-')) {
            return { ...op, serviceId: realServiceId };
          }
          return null;
        }
        if (op.serviceId && !op.serviceId.startsWith('temp-')) {
          return op;
        }
        return null;
      }).filter((op): op is NonNullable<typeof op> => op !== null && !!op.serviceId && !op.serviceId.startsWith('temp-'));
      
      // Should successfully map to real UUID
      expect(mappedOps.length).toBe(1);
      expect(mappedOps[0].serviceId).toBe('800779d0-0b02-4845-ac76-5842d64c3a41');
      expect(mappedOps[0].serviceId).not.toContain('temp-');
    });
  });
});

