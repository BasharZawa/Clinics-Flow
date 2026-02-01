/**
 * Appointment Service Unit Tests
 * 
 * Tests for:
 * - Creating appointments
 * - Checking availability
 * - Cancelling appointments with waitlist integration
 * - Recurring package appointments
 */

import { AppointmentService } from '../../src/services/appointment.service';
import { prismaMock } from '../mocks/prisma';
import { waitlistService } from '../../src/services/waitlist.service';
import { whatsappService } from '../../src/services/whatsapp.service';
import { AppError } from '../../src/utils/errors';

// Mock services
jest.mock('../../src/services/waitlist.service');
jest.mock('../../src/services/whatsapp.service');

describe('AppointmentService', () => {
  let service: AppointmentService;
  const mockClinicId = 'clinic-123';
  const mockUserId = 'user-123';

  beforeEach(() => {
    service = new AppointmentService();
    jest.clearAllMocks();
  });

  describe('createAppointment', () => {
    const validAppointmentData = {
      patientId: 'patient-123',
      staffId: 'staff-123',
      serviceId: 'service-123',
      appointmentDate: new Date('2026-02-15'),
      startTime: '10:00',
      endTime: '10:30',
      notes: 'Test appointment',
      appointmentType: 'single' as const,
    };

    it('should create a single appointment successfully', async () => {
      prismaMock.patient.findFirst.mockResolvedValue({
        id: 'patient-123',
        clinic_id: mockClinicId,
        full_name: 'Test Patient',
        phone: '+962795716713',
      } as any);

      prismaMock.appointment.findFirst.mockResolvedValue(null);

      const mockAppointment = {
        id: 'appt-123',
        ...validAppointmentData,
        clinic_id: mockClinicId,
        status: 'confirmed',
        created_at: new Date(),
      };
      prismaMock.appointment.create.mockResolvedValue(mockAppointment as any);

      const result = await service.createAppointment(
        mockClinicId,
        mockUserId,
        validAppointmentData
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('appt-123');
      expect(prismaMock.appointment.create).toHaveBeenCalled();
    });

    it('should throw error if patient not found', async () => {
      prismaMock.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(mockClinicId, mockUserId, validAppointmentData)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if time slot is already booked', async () => {
      prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      
      prismaMock.appointment.findFirst.mockResolvedValue({
        id: 'existing-appt',
        status: 'confirmed',
      } as any);

      await expect(
        service.createAppointment(mockClinicId, mockUserId, validAppointmentData)
      ).rejects.toThrow('Time slot is already booked');
    });

    it.skip('should create package appointments for recurring treatments', async () => {
      // TODO: This test needs more complex mocking for the package creation loop
      const packageData = {
        ...validAppointmentData,
        appointmentType: 'package' as const,
        packageSessions: 6,
        intervalDays: 28,
      };

      prismaMock.patient.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      prismaMock.appointment.findFirst.mockResolvedValue(null);
      prismaMock.package.create.mockResolvedValue({
        id: 'package-123',
        total_sessions: 6,
      } as any);
      prismaMock.appointment.create.mockResolvedValue({
        id: 'appt-123',
        status: 'confirmed',
      } as any);

      const result = await service.createAppointment(
        mockClinicId,
        mockUserId,
        packageData
      );

      expect(prismaMock.appointment.create).toHaveBeenCalledTimes(6);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      const mockAppointment = {
        id: 'appt-123',
        clinic_id: mockClinicId,
        patient_id: 'patient-123',
        staff_id: 'staff-123',
        service_id: 'service-123',
        appointment_date: new Date('2026-02-15'),
        start_time: new Date('2026-02-15T10:00:00'),
        end_time: new Date('2026-02-15T10:30:00'),
        status: 'confirmed',
        patient: { full_name: 'Test Patient', phone: '+962795716713' },
      };

      prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment as any);
      prismaMock.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled_by_patient',
      } as any);

      const result = await service.cancelAppointment(
        mockClinicId,
        'appt-123',
        'cancelled_by_patient',
        true
      );

      expect(prismaMock.appointment.update).toHaveBeenCalled();
      expect(result.status).toBe('cancelled_by_patient');
    });

    it('should not trigger waitlist if cancelled by clinic', async () => {
      const mockAppointment = {
        id: 'appt-123',
        clinic_id: mockClinicId,
        status: 'confirmed',
      };

      prismaMock.appointment.findFirst.mockResolvedValue(mockAppointment as any);
      prismaMock.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled_by_clinic',
      } as any);

      await service.cancelAppointment(
        mockClinicId,
        'appt-123',
        'cancelled_by_clinic',
        false
      );

      expect(waitlistService.findAndFillSlot).not.toHaveBeenCalled();
    });
  });

  describe('getAvailability', () => {
    it('should return available slots for a date', async () => {
      const date = new Date('2026-02-15');
      const staffId = 'staff-123';
      const serviceId = 'service-123';

      prismaMock.service.findFirst.mockResolvedValue({
        id: serviceId,
        duration_minutes: 30,
      } as any);

      prismaMock.workingHours.findFirst.mockResolvedValue({
        day_of_week: 0,
        open_time: '09:00:00',
        close_time: '17:00:00',
        is_working: true,
      } as any);

      prismaMock.appointment.findMany.mockResolvedValue([
        { start_time: '10:00:00', end_time: '10:30:00' },
        { start_time: '14:00:00', end_time: '14:30:00' },
      ] as any);

      prismaMock.blockedSlot.findMany.mockResolvedValue([]);

      const slots = await service.getAvailability(
        mockClinicId,
        date,
        staffId,
        serviceId
      );

      expect(slots).toBeInstanceOf(Array);
      expect(slots.length).toBeGreaterThan(0);
    });
  });

  describe('checkConflicts', () => {
    it('should return true if no conflicts', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(null);

      const result = await service.checkConflicts(
        mockClinicId,
        'staff-123',
        new Date('2026-02-15'),
        '10:00',
        '10:30'
      );

      expect(result).toBe(true);
    });

    it('should return false if slot is taken', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue({
        id: 'existing-appt',
      } as any);

      const result = await service.checkConflicts(
        mockClinicId,
        'staff-123',
        new Date('2026-02-15'),
        '10:00',
        '10:30'
      );

      expect(result).toBe(false);
    });
  });
});
