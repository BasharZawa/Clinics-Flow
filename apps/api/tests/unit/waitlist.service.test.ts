/**
 * Waitlist Service Unit Tests
 */

import { WaitlistService } from '../../src/services/waitlist.service';
import { prismaMock } from '../mocks/prisma';

describe('WaitlistService', () => {
  let service: WaitlistService;
  const mockClinicId = 'clinic-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    service = new WaitlistService();
    jest.clearAllMocks();
  });

  describe('addToWaitlist', () => {
    it('should add patient to waitlist', async () => {
      const waitlistData = {
        patientId: 'patient-123',
        serviceId: 'service-123',
        preferredDateStart: new Date('2026-02-01'),
        preferredDateEnd: new Date('2026-02-28'),
        notes: ' urgent',
      };

      prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      prismaMock.service.findFirst.mockResolvedValue({ id: 'service-123' } as any);
      prismaMock.waitlist.create.mockResolvedValue({
        id: 'waitlist-123',
        ...waitlistData,
      } as any);

      const result = await service.addToWaitlist(mockClinicId, mockUserId, waitlistData);

      expect(result).toBeDefined();
      expect(result.id).toBe('waitlist-123');
    });

    it('should throw error if patient not found', async () => {
      prismaMock.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWaitlist(mockClinicId, mockUserId, {
          patientId: 'invalid',
          serviceId: 'service-123',
        })
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('findAndFillSlot', () => {
    it('should find matching waitlist entry and offer slot', async () => {
      const cancelledAppt = {
        id: 'appt-123',
        staff_id: 'staff-123',
        service_id: 'service-123',
        appointment_date: new Date('2026-02-15'),
        start_time: new Date('2026-02-15T10:00:00'),
        end_time: new Date('2026-02-15T10:30:00'),
      };

      prismaMock.waitlist.findMany.mockResolvedValue([
        {
          id: 'waitlist-1',
          patient: { full_name: 'Waiting Patient', phone: '+962799999999' },
        },
      ] as any);

      prismaMock.waitlist.update.mockResolvedValue({ id: 'waitlist-1' } as any);

      const result = await service.findAndFillSlot(mockClinicId, cancelledAppt);

      expect(result).toBe(true);
      expect(prismaMock.waitlist.update).toHaveBeenCalled();
    });

    it('should return false if no matches found', async () => {
      const cancelledAppt = {
        id: 'appt-123',
        staff_id: 'staff-123',
        service_id: 'service-123',
        appointment_date: new Date('2026-02-15'),
        start_time: new Date('2026-02-15T10:00:00'),
        end_time: new Date('2026-02-15T10:30:00'),
      };

      prismaMock.waitlist.findMany.mockResolvedValue([]);

      const result = await service.findAndFillSlot(mockClinicId, cancelledAppt);

      expect(result).toBe(false);
    });
  });

  describe('acceptWaitlistOffer', () => {
    it('should create appointment from waitlist offer', async () => {
      prismaMock.waitlist.findFirst.mockResolvedValue({
        id: 'waitlist-123',
        status: 'offered',
        patient: { id: 'patient-123' },
        service: { id: 'service-123', duration_minutes: 30 },
      } as any);

      prismaMock.appointment.create.mockResolvedValue({ id: 'new-appt' } as any);
      prismaMock.waitlist.update.mockResolvedValue({ id: 'waitlist-123' } as any);

      const result = await service.acceptWaitlistOffer(
        mockClinicId,
        'waitlist-123',
        new Date('2026-02-15'),
        '10:00'
      );

      expect(result).toBeDefined();
      expect(prismaMock.appointment.create).toHaveBeenCalled();
    });
  });

  describe('getWaitlistStats', () => {
    it('should return waitlist statistics', async () => {
      prismaMock.waitlist.count.mockResolvedValue(10);

      const stats = await service.getWaitlistStats(mockClinicId);

      expect(stats.total).toBeDefined();
      expect(stats.active).toBeDefined();
      expect(stats.filled).toBeDefined();
    });
  });
});
