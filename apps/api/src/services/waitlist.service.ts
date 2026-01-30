import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { format, parse } from 'date-fns';

export interface AddToWaitlistInput {
  patientId: string;
  serviceId: string;
  preferredStaffId?: string;
  preferredDateStart?: Date;
  preferredDateEnd?: Date;
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  preferredDaysOfWeek?: number[];
  priority?: number;
  notes?: string;
}

export class WaitlistService {
  async addToWaitlist(
    clinicId: string,
    userId: string,
    data: AddToWaitlistInput
  ) {
    // Verify patient
    const patient = await prisma.patients.findFirst({
      where: { id: data.patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Verify service
    const service = await prisma.services.findFirst({
      where: { id: data.serviceId, clinic_id: clinicId },
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    return prisma.waitlist.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patientId,
        service_id: data.serviceId,
        preferred_staff_id: data.preferredStaffId,
        preferred_date_start: data.preferredDateStart,
        preferred_date_end: data.preferredDateEnd,
        preferred_time_start: data.preferredTimeStart
          ? parse(data.preferredTimeStart, 'HH:mm', new Date())
          : undefined,
        preferred_time_end: data.preferredTimeEnd
          ? parse(data.preferredTimeEnd, 'HH:mm', new Date())
          : undefined,
        preferred_days_of_week: data.preferredDaysOfWeek,
        priority: data.priority || 0,
        notes: data.notes,
        created_by: userId,
        status: 'active',
      },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
        services: { select: { id: true, name_ar: true } },
      },
    });
  }

  async findAndFillSlot(
    clinicId: string,
    cancelledAppointment: {
      id: string;
      staff_id: string;
      service_id: string;
      appointment_date: Date;
      start_time: Date;
      end_time: Date;
    }
  ): Promise<boolean> {
    const dayOfWeek = cancelledAppointment.appointment_date.getDay();

    // Find matching waitlist entries
    const matches = await prisma.waitlist.findMany({
      where: {
        clinic_id: clinicId,
        status: 'active',
        service_id: cancelledAppointment.service_id,
        OR: [
          { preferred_staff_id: null },
          { preferred_staff_id: cancelledAppointment.staff_id },
        ],
        OR: [
          { preferred_date_start: null },
          {
            preferred_date_start: { lte: cancelledAppointment.appointment_date },
            preferred_date_end: { gte: cancelledAppointment.appointment_date },
          },
        ],
        OR: [
          { preferred_time_start: null },
          {
            preferred_time_start: { lte: cancelledAppointment.start_time },
            preferred_time_end: { gte: cancelledAppointment.end_time },
          },
        ],
        OR: [
          { preferred_days_of_week: { isEmpty: true } },
          { preferred_days_of_week: { has: dayOfWeek } },
        ],
      },
      include: {
        patients: { select: { full_name: true, phone: true } },
      },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      take: 1,
    });

    if (matches.length === 0) {
      return false;
    }

    const match = matches[0];

    // Update waitlist entry
    await prisma.waitlist.update({
      where: { id: match.id },
      data: {
        status: 'offered',
        notes: `Offered slot: ${format(cancelledAppointment.appointment_date, 'yyyy-MM-dd')} ${format(
          cancelledAppointment.start_time,
          'HH:mm'
        )}`,
      },
    });

    // TODO: Send WhatsApp notification
    console.log(
      `Offering slot to ${match.patients.full_name} at ${match.patients.phone}`
    );

    return true;
  }

  async acceptWaitlistOffer(
    clinicId: string,
    waitlistId: string,
    date: Date,
    time: string
  ) {
    const waitlistEntry = await prisma.waitlist.findFirst({
      where: {
        id: waitlistId,
        clinic_id: clinicId,
        status: 'offered',
      },
      include: {
        patients: true,
        services: true,
      },
    });

    if (!waitlistEntry) {
      throw new AppError(
        'Waitlist offer not found or expired',
        404,
        'WAITLIST_NOT_FOUND'
      );
    }

    const startTime = parse(time, 'HH:mm', new Date());
    const endTime = new Date(
      startTime.getTime() + waitlistEntry.services.duration_minutes * 60000
    );

    // Create appointment
    const appointment = await prisma.appointments.create({
      data: {
        clinic_id: clinicId,
        patient_id: waitlistEntry.patient_id,
        staff_id: waitlistEntry.preferred_staff_id || waitlistEntry.services.id,
        service_id: waitlistEntry.service_id,
        appointment_date: date,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        source: 'waitlist',
      },
    });

    // Update waitlist
    await prisma.waitlist.update({
      where: { id: waitlistId },
      data: {
        status: 'filled',
        filled_appointment_id: appointment.id,
        filled_at: new Date(),
      },
    });

    return appointment;
  }

  async getWaitlist(
    clinicId: string,
    options: {
      status?: string;
      serviceId?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { clinic_id: clinicId };
    if (options.status) where.status = options.status;
    if (options.serviceId) where.service_id = options.serviceId;

    const [entries, total] = await Promise.all([
      prisma.waitlist.findMany({
        where,
        include: {
          patients: { select: { id: true, full_name: true, phone: true } },
          services: { select: { id: true, name_ar: true } },
          users: { select: { id: true, full_name_ar: true } },
          filled_appointment: {
            select: { appointment_date: true, start_time: true },
          },
        },
        orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.waitlist.count({ where }),
    ]);

    return {
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async cancelWaitlist(clinicId: string, waitlistId: string) {
    const entry = await prisma.waitlist.findFirst({
      where: { id: waitlistId, clinic_id: clinicId },
    });

    if (!entry) {
      throw new AppError('Waitlist entry not found', 404, 'NOT_FOUND');
    }

    return prisma.waitlist.update({
      where: { id: waitlistId },
      data: { status: 'cancelled' },
    });
  }

  async getWaitlistStats(clinicId: string) {
    const [total, active, filled, expired] = await Promise.all([
      prisma.waitlist.count({ where: { clinic_id: clinicId } }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'active' },
      }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'filled' },
      }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'expired' },
      }),
    ]);

    return {
      total,
      active,
      filled,
      expired,
      cancelled: total - active - filled - expired,
    };
  }
}

export const waitlistService = new WaitlistService();
