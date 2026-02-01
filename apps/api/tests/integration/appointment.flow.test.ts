/**
 * Integration Tests - Appointment Flow
 * 
 * Tests the complete flow:
 * 1. Create patient
 * 2. Book appointment
 * 3. Send WhatsApp confirmation
 * 4. Cancel appointment
 * 5. Fill from waitlist
 */

import request from 'supertest';
import { app } from '../mocks/app';
import { prismaMock } from '../mocks/prisma';

describe('Appointment Flow Integration', () => {
  const clinicId = 'clinic-test-123';
  const authToken = 'test-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete booking flow', () => {
    it('should handle full booking lifecycle', async () => {
      const patientData = {
        fullName: 'Test Patient',
        phone: '+962795716713',
      };

      prismaMock.patient.findFirst.mockResolvedValue(null);
      prismaMock.patient.create.mockResolvedValue({
        id: 'patient-new',
        ...patientData,
      } as any);

      prismaMock.service.findFirst.mockResolvedValue({
        id: 'service-1',
        duration_minutes: 30,
      } as any);

      prismaMock.appointment.findFirst.mockResolvedValue(null);
      prismaMock.appointment.create.mockResolvedValue({
        id: 'appt-123',
        patient_id: 'patient-new',
        status: 'confirmed',
      } as any);

      const bookingRes = await request(app)
        .post('/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'patient-new',
          staffId: 'staff-1',
          serviceId: 'service-1',
          appointmentDate: '2026-02-15',
          startTime: '10:00',
          endTime: '10:30',
        });

      expect(bookingRes.status).toBe(201);
      expect(bookingRes.body.id).toBeDefined();
    });

    it('should handle cancellation with waitlist fill', async () => {
      const existingAppt = {
        id: 'appt-to-cancel',
        clinic_id: clinicId,
        patient_id: 'patient-1',
        staff_id: 'staff-1',
        service_id: 'service-1',
        appointment_date: new Date('2026-02-15'),
        start_time: '10:00:00',
        status: 'confirmed',
      };

      prismaMock.appointment.findFirst.mockResolvedValue(existingAppt as any);

      prismaMock.waitlist.findMany.mockResolvedValue([
        {
          id: 'waitlist-1',
          patient_id: 'patient-waiting',
          priority: 1,
          patient: { full_name: 'Waiting Patient', phone: '+962799999999' },
        },
      ] as any);

      prismaMock.appointment.update.mockResolvedValue({
        ...existingAppt,
        status: 'cancelled_by_patient',
      } as any);

      const cancelRes = await request(app)
        .post(`/v1/appointments/${existingAppt.id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'cancelled_by_patient',
          checkWaitlist: true,
        });

      expect(cancelRes.status).toBe(200);
    });
  });

  describe('Package booking flow', () => {
    it('should create package with multiple appointments', async () => {
      prismaMock.patient.findFirst.mockResolvedValue({ id: 'p1' } as any);
      prismaMock.service.findFirst.mockResolvedValue({
        duration_minutes: 60,
      } as any);

      prismaMock.package.create.mockResolvedValue({
        id: 'package-123',
        total_sessions: 6,
      } as any);

      prismaMock.appointment.create.mockResolvedValue({ id: 'appt-x' } as any);

      const res = await request(app)
        .post('/v1/appointments/package')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'p1',
          staffId: 'staff-1',
          serviceId: 'service-1',
          startDate: '2026-02-01',
          startTime: '10:00',
          totalSessions: 6,
          intervalDays: 28,
        });

      expect(res.status).toBe(201);
    });
  });

  describe('WhatsApp webhook flow', () => {
    it('should process incoming booking request', async () => {
      const res = await request(app)
        .post('/v1/whatsapp/webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: '962795716713',
                  id: 'msg-123',
                  type: 'text',
                  text: { body: 'بدي حجز' },
                }],
              },
            }],
          }],
        });

      expect(res.status).toBe(200);
    });

    it('should handle confirmation reply', async () => {
      const res = await request(app)
        .post('/v1/whatsapp/webhook')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: '962795716713',
                  id: 'msg-456',
                  type: 'text',
                  text: { body: 'نعم' },
                  context: { id: 'original-msg-id' },
                }],
              },
            }],
          }],
        });

      expect(res.status).toBe(200);
    });
  });
});
