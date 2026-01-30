/**
 * Waitlist Service Unit Tests
 * 
 * Tests for:
 * - Adding to waitlist
 * - Finding matches for cancelled slots
 * - Notifying patients
 * - Filling slots from waitlist
 */

import { WaitlistService } from '../../src/services/waitlist.service';
import { prismaMock } from '../mocks/prisma';
import { whatsappService } from '../../src/services/whatsapp.service';

jest.mock('../../src/services/whatsapp.service');

describe('WaitlistService', () => {
  let service: WaitlistService;
  const mockClinicId = 'clinic-123';

  beforeEach(() => {
    service = new WaitlistService();
    jest.clearAllMocks();
  });

  describe('addToWaitlist', () => {
    const waitlistData = {
      patientId: 'patient-123',
      serviceId: 'service-123',
      preferredStaffId: 'staff-123',
      preferredDateStart: new Date('2026-02-01'),
      preferredDateEnd: new Date('2026-02-15'),
      preferredTimeStart: '09:00',
      preferredTimeEnd: '17:00',
      preferredDaysOfWeek: [1, 3, 5], // Sat, Mon, Wed
      priority: 1,
      notes: 'Urgent',
    };

    it('should add patient to waitlist successfully', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({
        id: 'patient-123',
        full_name: 'Test Patient',
      } as any);

      prismaMock.waitlist.create.mockResolvedValue({
        id: 'waitlist-123',
        ...waitlistData,
        status: 'active',
      } as any);

      const result = await service.addToWaitlist(
        mockClinicId,
        'user-123',
        waitlistData
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('waitlist-123');
      expect(prismaMock.waitlist.create).toHaveBeenCalled();
    });

    it('should throw error if patient not found', async () => {
      prismaMock.patients.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWaitlist(mockClinicId, 'user-123', waitlistData)
      ).rejects.toThrow('Patient not found');
    });
  });

  describe('findAndFillSlot', () => {
    const cancelledAppointment = {
      id: 'appt-123',
      clinic_id: mockClinicId,
      staff_id: 'staff-123',
      service_id: 'service-123',
      appointment_date: new Date('2026-02-15'),
      start_time: '10:00:00',
      end_time: '10:30:00',
    };

    it('should find matching waitlist entry and send offer', async () => {
      const matchingWaitlist = {
        id: 'waitlist-123',
        patient_id: 'patient-456',
        preferred_staff_id: 'staff-123',
        priority: 5,
        patients: {
          full_name: 'Waitlist Patient',
          phone: '+962795716714',
        },
      };

      prismaMock.waitlist.findMany.mockResolvedValue([matchingWaitlist] as any);
      prismaMock.waitlist.update.mockResolvedValue({
        ...matchingWaitlist,
        status: 'offered',
      } as any);

      (whatsappService.sendWaitlistOffer as jest.Mock).mockResolvedValue(true);

      const result = await service.findAndFillSlot(
        mockClinicId,
        cancelledAppointment as any
      );

      expect(result).toBe(true);
      expect(whatsappService.sendWaitlistOffer).toHaveBeenCalledWith(
        '+962795716714',
        'Waitlist Patient',
        expect.any(Object),
        'waitlist-123'
      );
    });

    it('should return false if no matching waitlist entries', async () => {
      prismaMock.waitlist.findMany.mockResolvedValue([]);

      const result = await service.findAndFillSlot(
        mockClinicId,
        cancelledAppointment as any
      );

      expect(result).toBe(false);
      expect(whatsappService.sendWaitlistOffer).not.toHaveBeenCalled();
    });

    it('should prioritize by date added and priority score', async () => {
      const waitlistEntries = [
        {
          id: 'waitlist-1',
          patient_id: 'patient-1',
          priority: 1,
          created_at: new Date('2026-01-01'),
          patients: { full_name: 'First', phone: '+111' },
        },
        {
          id: 'waitlist-2',
          patient_id: 'patient-2',
          priority: 5, // Higher priority
          created_at: new Date('2026-01-02'),
          patients: { full_name: 'Second', phone: '+222' },
        },
      ];

      prismaMock.waitlist.findMany.mockResolvedValue(waitlistEntries as any);
      prismaMock.waitlist.update.mockResolvedValue({} as any);

      await service.findAndFillSlot(mockClinicId, cancelledAppointment as any);

      // Should offer to highest priority first
      expect(whatsappService.sendWaitlistOffer).toHaveBeenCalledWith(
        '+222',
        'Second',
        expect.any(Object),
        'waitlist-2'
      );
    });
  });

  describe('acceptWaitlistOffer', () => {
    it('should create appointment when patient accepts offer', async () => {
      const waitlistEntry = {
        id: 'waitlist-123',
        clinic_id: mockClinicId,
        patient_id: 'patient-123',
        service_id: 'service-123',
        preferred_staff_id: 'staff-123',
        status: 'offered',
        patients: { full_name: 'Test Patient' },
      };

      prismaMock.waitlist.findFirst.mockResolvedValue(waitlistEntry as any);
      
      // Mock no conflicts
      prismaMock.appointments.findFirst.mockResolvedValue(null);
      
      prismaMock.appointments.create.mockResolvedValue({
        id: 'new-appt-123',
        status: 'confirmed',
      } as any);

      prismaMock.waitlist.update.mockResolvedValue({
        ...waitlistEntry,
        status: 'filled',
        filled_appointment_id: 'new-appt-123',
      } as any);

      const result = await service.acceptWaitlistOffer(
        mockClinicId,
        'waitlist-123',
        new Date('2026-02-15'),
        '10:00'
      );

      expect(result).toBeDefined();
      expect(prismaMock.appointments.create).toHaveBeenCalled();
      expect(whatsappService.sendBookingConfirmation).toHaveBeenCalled();
    });

    it('should throw error if offer expired or not found', async () => {
      prismaMock.waitlist.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptWaitlistOffer(
          mockClinicId,
          'waitlist-123',
          new Date('2026-02-15'),
          '10:00'
        )
      ).rejects.toThrow('Waitlist offer not found or expired');
    });
  });

  describe('getWaitlistStats', () => {
    it('should return waitlist statistics', async () => {
      prismaMock.waitlist.count.mockResolvedValue(15);
      prismaMock.waitlist.groupBy.mockResolvedValue([
        { status: 'active', _count: { status: 10 } },
        { status: 'filled', _count: { status: 4 } },
        { status: 'expired', _count: { status: 1 } },
      ] as any);

      const stats = await service.getWaitlistStats(mockClinicId);

      expect(stats.total).toBe(15);
      expect(stats.active).toBe(10);
      expect(stats.filled).toBe(4);
    });
  });
});
