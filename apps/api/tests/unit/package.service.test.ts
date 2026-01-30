/**
 * Package Service Unit Tests
 * 
 * Tests for:
 * - Creating packages with recurring appointments
 * - Rescheduling individual sessions
 * - Tracking package progress
 * - Completing/cancelling packages
 */

import { PackageService } from '../../src/services/package.service';
import { prismaMock } from '../mocks/prisma';
import { AppError } from '../../src/utils/errors';

describe('PackageService', () => {
  let service: PackageService;
  const mockClinicId = 'clinic-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    service = new PackageService();
    jest.clearAllMocks();
  });

  describe('createPackage', () => {
    const packageData = {
      patientId: 'patient-123',
      serviceId: 'service-123',
      staffId: 'staff-123',
      name: 'حزمة ليزر كامل الجسم',
      totalSessions: 6,
      intervalDays: 28,
      startDate: new Date('2026-02-01'),
      totalPrice: 300,
      notes: 'ملاحظات',
    };

    it('should create package with calculated appointments', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({
        id: 'patient-123',
        full_name: 'Test Patient',
      } as any);

      prismaMock.services.findFirst.mockResolvedValue({
        id: 'service-123',
        duration_minutes: 60,
        name_ar: 'ليزر',
      } as any);

      prismaMock.packages.create.mockResolvedValue({
        id: 'package-123',
        ...packageData,
        price_per_session: 50,
        status: 'active',
      } as any);

      // Mock appointment creation for each session
      prismaMock.appointments.create.mockResolvedValue({
        id: 'appt-123',
        status: 'confirmed',
      } as any);

      const result = await service.createPackage(
        mockClinicId,
        mockUserId,
        packageData
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('package-123');
      expect(prismaMock.appointments.create).toHaveBeenCalledTimes(6);
    });

    it('should calculate correct dates for recurring sessions', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      prismaMock.services.findFirst.mockResolvedValue({
        duration_minutes: 30,
      } as any);

      prismaMock.packages.create.mockResolvedValue({
        id: 'package-123',
      } as any);

      const createdAppointments: any[] = [];
      prismaMock.appointments.create.mockImplementation((args: any) => {
        createdAppointments.push(args.data);
        return Promise.resolve({ id: `appt-${createdAppointments.length}` } as any);
      });

      await service.createPackage(mockClinicId, mockUserId, {
        ...packageData,
        startDate: new Date('2026-02-01'),
        intervalDays: 7, // Weekly
      });

      // Check that appointments are spaced correctly
      expect(createdAppointments).toHaveLength(6);
      expect(createdAppointments[0].appointment_date).toEqual(new Date('2026-02-01'));
      expect(createdAppointments[1].appointment_date).toEqual(new Date('2026-02-08'));
      expect(createdAppointments[2].appointment_date).toEqual(new Date('2026-02-15'));
    });

    it('should calculate per-session price correctly', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      prismaMock.services.findFirst.mockResolvedValue({
        duration_minutes: 30,
      } as any);

      prismaMock.packages.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'package-123',
          ...args.data,
        } as any);
      });

      const result = await service.createPackage(mockClinicId, mockUserId, {
        ...packageData,
        totalPrice: 300,
        totalSessions: 6,
      });

      expect(result.price_per_session).toBe(50); // 300 / 6
    });
  });

  describe('getPackage', () => {
    it('should return package with all appointments', async () => {
      const mockPackage = {
        id: 'package-123',
        name: 'حزمة ليزر',
        total_sessions: 6,
        status: 'active',
        appointments: [
          { id: 'appt-1', session_number: 1, status: 'completed' },
          { id: 'appt-2', session_number: 2, status: 'confirmed' },
          { id: 'appt-3', session_number: 3, status: 'confirmed' },
        ],
      };

      prismaMock.packages.findFirst.mockResolvedValue(mockPackage as any);

      const result = await service.getPackage(mockClinicId, 'package-123');

      expect(result).toBeDefined();
      expect(result.appointments).toHaveLength(3);
      expect(result.completed_sessions).toBe(1);
      expect(result.remaining_sessions).toBe(5);
    });

    it('should throw error if package not found', async () => {
      prismaMock.packages.findFirst.mockResolvedValue(null);

      await expect(
        service.getPackage(mockClinicId, 'package-123')
      ).rejects.toThrow(AppError);
    });
  });

  describe('rescheduleSession', () => {
    it('should reschedule a specific session in package', async () => {
      const mockPackage = {
        id: 'package-123',
        status: 'active',
        appointments: [
          { id: 'appt-3', session_number: 3, status: 'confirmed' },
        ],
      };

      prismaMock.packages.findFirst.mockResolvedValue(mockPackage as any);
      
      // Mock no conflicts
      prismaMock.appointments.findFirst.mockResolvedValue(null);
      
      prismaMock.appointments.update.mockResolvedValue({
        id: 'appt-3',
        appointment_date: new Date('2026-03-15'),
        start_time: '14:00:00',
      } as any);

      const result = await service.rescheduleSession(
        mockClinicId,
        'package-123',
        3, // Session number
        new Date('2026-03-15'),
        '14:00'
      );

      expect(result).toBeDefined();
      expect(prismaMock.appointments.update).toHaveBeenCalled();
    });

    it('should not allow rescheduling completed sessions', async () => {
      const mockPackage = {
        id: 'package-123',
        appointments: [
          { id: 'appt-1', session_number: 1, status: 'completed' },
        ],
      };

      prismaMock.packages.findFirst.mockResolvedValue(mockPackage as any);

      await expect(
        service.rescheduleSession(
          mockClinicId,
          'package-123',
          1,
          new Date('2026-03-15'),
          '14:00'
        )
      ).rejects.toThrow('Cannot reschedule completed session');
    });
  });

  describe('pausePackage', () => {
    it('should pause active package', async () => {
      prismaMock.packages.findFirst.mockResolvedValue({
        id: 'package-123',
        status: 'active',
      } as any);

      prismaMock.packages.update.mockResolvedValue({
        id: 'package-123',
        status: 'paused',
      } as any);

      const result = await service.pausePackage(mockClinicId, 'package-123');

      expect(result.status).toBe('paused');
    });

    it('should cancel all pending appointments when paused', async () => {
      prismaMock.packages.findFirst.mockResolvedValue({
        id: 'package-123',
        status: 'active',
      } as any);

      prismaMock.appointments.updateMany.mockResolvedValue({ count: 3 } as any);

      await service.pausePackage(mockClinicId, 'package-123');

      expect(prismaMock.appointments.updateMany).toHaveBeenCalledWith({
        where: {
          package_id: 'package-123',
          status: { in: ['pending', 'confirmed'] },
        },
        data: { status: 'cancelled_by_clinic' },
      });
    });
  });

  describe('resumePackage', () => {
    it('should resume paused package and recreate appointments', async () => {
      prismaMock.packages.findFirst.mockResolvedValue({
        id: 'package-123',
        status: 'paused',
        completed_sessions: 2,
        total_sessions: 6,
      } as any);

      prismaMock.packages.update.mockResolvedValue({
        id: 'package-123',
        status: 'active',
      } as any);

      // Should create remaining appointments
      prismaMock.appointments.create.mockResolvedValue({ id: 'new-appt' } as any);

      const result = await service.resumePackage(
        mockClinicId,
        'package-123',
        new Date('2026-03-01') // New start date for remaining sessions
      );

      expect(result.status).toBe('active');
      expect(prismaMock.appointments.create).toHaveBeenCalledTimes(4); // 6 - 2 = 4 remaining
    });
  });

  describe('completePackage', () => {
    it('should mark package as completed', async () => {
      prismaMock.packages.findFirst.mockResolvedValue({
        id: 'package-123',
        status: 'active',
        total_sessions: 6,
      } as any);

      prismaMock.appointments.count.mockResolvedValue(6); // All sessions completed

      prismaMock.packages.update.mockResolvedValue({
        id: 'package-123',
        status: 'completed',
        completed_at: new Date(),
      } as any);

      const result = await service.completePackage(mockClinicId, 'package-123');

      expect(result.status).toBe('completed');
    });

    it('should auto-complete when all sessions are done', async () => {
      prismaMock.packages.findFirst.mockResolvedValue({
        id: 'package-123',
        status: 'active',
      } as any);

      prismaMock.appointments.count.mockResolvedValue(6);
      prismaMock.appointments.aggregate.mockResolvedValue({
        _count: { status: 6 },
      } as any);

      await service.checkAndCompletePackage(mockClinicId, 'package-123');

      expect(prismaMock.packages.update).toHaveBeenCalledWith({
        where: { id: 'package-123' },
        data: {
          status: 'completed',
          completed_at: expect.any(Date),
        },
      });
    });
  });

  describe('getPackageStats', () => {
    it('should return statistics for all packages', async () => {
      prismaMock.packages.groupBy.mockResolvedValue([
        { status: 'active', _count: { status: 10 } },
        { status: 'completed', _count: { status: 25 } },
        { status: 'cancelled', _count: { status: 5 } },
      ] as any);

      prismaMock.packages.aggregate.mockResolvedValue({
        _sum: { total_price: 15000 },
      } as any);

      const stats = await service.getPackageStats(mockClinicId);

      expect(stats.total).toBe(40);
      expect(stats.active).toBe(10);
      expect(stats.completed).toBe(25);
      expect(stats.total_revenue).toBe(15000);
    });
  });
});
