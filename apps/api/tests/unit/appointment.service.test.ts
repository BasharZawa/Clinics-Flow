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
      // Mock patient exists
      prismaMock.patients.findFirst.mockResolvedValue({
        id: 'patient-123',
        clinic_id: mockClinicId,
        full_name: 'Test Patient',
        phone: '+962795716713',
      } as any);

      // Mock no conflicting appointments
      prismaMock.appointments.findFirst.mockResolvedValue(null);

      // Mock created appointment
      const mockAppointment = {
        id: 'appt-123',
        ...validAppointmentData,
        clinic_id: mockClinicId,
        status: 'confirmed',
        created_at: new Date(),
      };
      prismaMock.appointments.create.mockResolvedValue(mockAppointment as any);

      const result = await service.createAppointment(
        mockClinicId,
        mockUserId,
        validAppointmentData
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('appt-123');
      expect(prismaMock.appointments.create).toHaveBeenCalled();
    });

    it('should throw error if patient not found', async () => {
      prismaMock.patients.findFirst.mockResolvedValue(null);

      await expect(
        service.createAppointment(mockClinicId, mockUserId, validAppointmentData)
      ).rejects.toThrow(AppError);
    });

    it('should throw error if time slot is already booked', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      
      // Mock existing appointment in same slot
      prismaMock.appointments.findFirst.mockResolvedValue({
        id: 'existing-appt',
        status: 'confirmed',
      } as any);

      await expect(
        service.createAppointment(mockClinicId, mockUserId, validAppointmentData)
      ).rejects.toThrow('Time slot is already booked');
    });

    it('should create package appointments for recurring treatments', async () => {
      const packageData = {
        ...validAppointmentData,
        appointmentType: 'package' as const,
        packageSessions: 6,
        intervalDays: 28,
      };

      prismaMock.patients.findFirst.mockResolvedValue({ id: 'patient-123' } as any);
      prismaMock.appointments.findFirst.mockResolvedValue(null);

      // Mock package creation
      prismaMock.packages.create.mockResolvedValue({
        id: 'package-123',
        total_sessions: 6,
      } as any);

      // Mock appointment creation for each session
      prismaMock.appointments.create.mockResolvedValue({
        id: 'appt-123',
        status: 'confirmed',
      } as any);

      const result = await service.createAppointment(
        mockClinicId,
        mockUserId,
        packageData
      );

      expect(prismaMock.appointments.create).toHaveBeenCalledTimes(6);
      expect(whatsappService.sendBookingConfirmation).toHaveBeenCalled();
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment and trigger waitlist check', async () => {
      const mockAppointment = {
        id: 'appt-123',
        clinic_id: mockClinicId,
        patient_id: 'patient-123',
        staff_id: 'staff-123',
        service_id: 'service-123',
        appointment_date: new Date('2026-02-15'),
        start_time: '10:00:00',
        end_time: '10:30:00',
        status: 'confirmed',
        patients: { full_name: 'Test Patient', phone: '+962795716713' },
      };

      prismaMock.appointments.findFirst.mockResolvedValue(mockAppointment as any);
      prismaMock.appointments.update.mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled_by_patient',
      } as any);

      (waitlistService.findAndFillSlot as jest.Mock).mockResolvedValue(true);

      await service.cancelAppointment(
        mockClinicId,
        'appt-123',
        'cancelled_by_patient',
        true // check waitlist
      );

      expect(prismaMock.appointments.update).toHaveBeenCalledWith({
        where: { id: 'appt-123' },
        data: { status: 'cancelled_by_patient' },
      });
      expect(waitlistService.findAndFillSlot).toHaveBeenCalled();
    });

    it('should not trigger waitlist if cancelled by clinic', async () => {
      const mockAppointment = {
        id: 'appt-123',
        clinic_id: mockClinicId,
        status: 'confirmed',
      };

      prismaMock.appointments.findFirst.mockResolvedValue(mockAppointment as any);
      prismaMock.appointments.update.mockResolvedValue({
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

      // Mock service duration
      prismaMock.services.findFirst.mockResolvedValue({
        id: serviceId,
        duration_minutes: 30,
      } as any);

      // Mock working hours
      prismaMock.working_hours.findFirst.mockResolvedValue({
        day_of_week: 0, // Sunday
        open_time: '09:00:00',
        close_time: '17:00:00',
        is_working: true,
      } as any);

      // Mock existing appointments
      prismaMock.appointments.findMany.mockResolvedValue([
        { start_time: '10:00:00', end_time: '10:30:00' },
        { start_time: '14:00:00', end_time: '14:30:00' },
      ] as any);

      // Mock blocked slots
      prismaMock.blocked_slots.findMany.mockResolvedValue([]);

      const slots = await service.getAvailability(
        mockClinicId,
        date,
        staffId,
        serviceId
      );

      expect(slots).toBeInstanceOf(Array);
      expect(slots.length).toBeGreaterThan(0);
      // Should not include booked slots
      expect(slots.some(s => s.start === '10:00')).toBe(false);
      expect(slots.some(s => s.start === '14:00')).toBe(false);
    });
  });

  describe('checkConflicts', () => {
    it('should return true if no conflicts', async () => {
      prismaMock.appointments.findFirst.mockResolvedValue(null);

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
      prismaMock.appointments.findFirst.mockResolvedValue({
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
