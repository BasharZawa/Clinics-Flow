import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';
import { addDays, format, parse, startOfDay } from 'date-fns';

export interface CreateAppointmentInput {
  patientId: string;
  staffId: string;
  serviceId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  notes?: string;
  appointmentType: 'single' | 'package';
  patientNotes?: string;
  internalNotes?: string;
}

export interface CreatePackageInput {
  patientId: string;
  staffId: string;
  serviceId: string;
  startDate: Date;
  startTime: string;
  totalSessions: number;
  intervalDays: number;
  name: string;
  totalPrice?: number;
  notes?: string;
}

export class AppointmentService {
  async createAppointment(
    clinicId: string,
    userId: string,
    data: CreateAppointmentInput
  ) {
    // Verify patient belongs to clinic
    const patient = await prisma.patients.findFirst({
      where: { id: data.patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Check for conflicts
    const hasConflict = await this.checkConflicts(
      clinicId,
      data.staffId,
      data.appointmentDate,
      data.startTime,
      data.endTime
    );

    if (!hasConflict) {
      throw new AppError('Time slot is already booked', 409, 'SLOT_UNAVAILABLE');
    }

    // Create appointment
    const appointment = await prisma.appointments.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patientId,
        staff_id: data.staffId,
        service_id: data.serviceId,
        appointment_date: data.appointmentDate,
        start_time: parse(data.startTime, 'HH:mm', new Date()),
        end_time: parse(data.endTime, 'HH:mm', new Date()),
        notes: data.notes,
        patient_notes: data.patientNotes,
        internal_notes: data.internalNotes,
        appointment_type: data.appointmentType,
        status: 'confirmed',
        created_by: userId,
      },
      include: {
        patients: true,
        services: true,
        users: true,
      },
    });

    return appointment;
  }

  async createPackage(
    clinicId: string,
    userId: string,
    data: CreatePackageInput
  ) {
    // Verify patient exists
    const patient = await prisma.patients.findFirst({
      where: { id: data.patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Get service duration
    const service = await prisma.services.findFirst({
      where: { id: data.serviceId, clinic_id: clinicId },
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    // Calculate package end date
    const expectedEndDate = addDays(
      data.startDate,
      (data.totalSessions - 1) * data.intervalDays
    );

    // Create package
    const pkg = await prisma.packages.create({
      data: {
        clinic_id: clinicId,
        patient_id: data.patientId,
        service_id: data.serviceId,
        staff_id: data.staffId,
        name: data.name,
        total_sessions: data.totalSessions,
        interval_days: data.intervalDays,
        total_price: data.totalPrice,
        price_per_session: data.totalPrice
          ? data.totalPrice / data.totalSessions
          : null,
        start_date: data.startDate,
        expected_end_date: expectedEndDate,
        created_by: userId,
        notes: data.notes,
      },
    });

    // Create appointments for each session
    const startTimeDate = parse(data.startTime, 'HH:mm', new Date());
    const endTimeDate = new Date(
      startTimeDate.getTime() + service.duration_minutes * 60000
    );
    const endTime = format(endTimeDate, 'HH:mm');

    const appointments = [];
    for (let i = 0; i < data.totalSessions; i++) {
      const sessionDate = addDays(data.startDate, i * data.intervalDays);

      const appointment = await prisma.appointments.create({
        data: {
          clinic_id: clinicId,
          patient_id: data.patientId,
          staff_id: data.staffId,
          service_id: data.serviceId,
          appointment_date: sessionDate,
          start_time: startTimeDate,
          end_time: endTimeDate,
          appointment_type: 'package',
          package_id: pkg.id,
          package_session_number: i + 1,
          status: 'confirmed',
          created_by: userId,
        },
      });

      appointments.push(appointment);
    }

    return { package: pkg, appointments };
  }

  async cancelAppointment(
    clinicId: string,
    appointmentId: string,
    reason: 'cancelled_by_patient' | 'cancelled_by_clinic',
    checkWaitlist: boolean = false
  ) {
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId, clinic_id: clinicId },
      include: { patients: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (['completed', 'cancelled_by_patient', 'cancelled_by_clinic'].includes(appointment.status)) {
      throw new AppError('Appointment cannot be cancelled', 400, 'INVALID_STATUS');
    }

    const updated = await prisma.appointments.update({
      where: { id: appointmentId },
      data: { status: reason },
      include: { patients: true, services: true, users: true },
    });

    // TODO: Check waitlist and fill if needed
    if (checkWaitlist && reason === 'cancelled_by_patient') {
      // This will be implemented in waitlist service
    }

    return updated;
  }

  async getAvailability(
    clinicId: string,
    date: Date,
    staffId: string,
    serviceId: string
  ): Promise<{ start: string; end: string }[]> {
    const service = await prisma.services.findFirst({
      where: { id: serviceId, clinic_id: clinicId },
    });

    if (!service) {
      throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
    }

    const dayOfWeek = date.getDay();

    // Get working hours
    const workingHours = await prisma.working_hours.findFirst({
      where: {
        clinic_id: clinicId,
        staff_id: staffId,
        day_of_week: dayOfWeek,
        is_working: true,
      },
    });

    if (!workingHours || !workingHours.open_time || !workingHours.close_time) {
      return [];
    }

    // Get existing appointments
    const existingAppointments = await prisma.appointments.findMany({
      where: {
        clinic_id: clinicId,
        staff_id: staffId,
        appointment_date: date,
        status: { in: ['pending', 'confirmed'] },
      },
      select: { start_time: true, end_time: true },
    });

    // Get blocked slots
    const blockedSlots = await prisma.blocked_slots.findMany({
      where: {
        clinic_id: clinicId,
        staff_id: staffId,
        block_date: date,
      },
      select: { start_time: true, end_time: true },
    });

    // Generate available slots
    const slots: { start: string; end: string }[] = [];
    const duration = service.duration_minutes;
    const startTime = new Date(`2000-01-01T${workingHours.open_time}`);
    const endTime = new Date(`2000-01-01T${workingHours.close_time}`);

    let currentTime = startTime;
    while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
      const slotStart = format(currentTime, 'HH:mm');
      const slotEndDate = new Date(currentTime.getTime() + duration * 60000);
      const slotEnd = format(slotEndDate, 'HH:mm');

      // Check if slot conflicts with existing appointments or blocked slots
      const hasConflict = [...existingAppointments, ...blockedSlots].some(
        (appt) => {
          const apptStart = format(new Date(`2000-01-01T${appt.start_time}`), 'HH:mm');
          const apptEnd = format(new Date(`2000-01-01T${appt.end_time}`), 'HH:mm');
          return slotStart < apptEnd && slotEnd > apptStart;
        }
      );

      if (!hasConflict) {
        slots.push({ start: slotStart, end: slotEnd });
      }

      currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30 min intervals
    }

    return slots;
  }

  async checkConflicts(
    clinicId: string,
    staffId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const startDateTime = parse(startTime, 'HH:mm', date);
    const endDateTime = parse(endTime, 'HH:mm', date);

    const existing = await prisma.appointments.findFirst({
      where: {
        clinic_id: clinicId,
        staff_id: staffId,
        appointment_date: date,
        status: { in: ['pending', 'confirmed'] },
        OR: [
          {
            // New appointment starts during existing
            start_time: { lte: endDateTime },
            end_time: { gt: startDateTime },
          },
        ],
      },
    });

    return !existing;
  }

  async getAppointments(
    clinicId: string,
    filters: {
      dateFrom?: Date;
      dateTo?: Date;
      staffId?: string;
      patientId?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { clinic_id: clinicId };

    if (filters.dateFrom && filters.dateTo) {
      where.appointment_date = {
        gte: filters.dateFrom,
        lte: filters.dateTo,
      };
    } else if (filters.dateFrom) {
      where.appointment_date = { gte: filters.dateFrom };
    } else if (filters.dateTo) {
      where.appointment_date = { lte: filters.dateTo };
    }

    if (filters.staffId) where.staff_id = filters.staffId;
    if (filters.patientId) where.patient_id = filters.patientId;
    if (filters.status) where.status = filters.status;

    const [appointments, total] = await Promise.all([
      prisma.appointments.findMany({
        where,
        include: {
          patients: { select: { id: true, full_name: true, phone: true } },
          users: { select: { id: true, full_name_ar: true, role: true } },
          services: { select: { id: true, name_ar: true, duration_minutes: true } },
        },
        orderBy: { appointment_date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.appointments.count({ where }),
    ]);

    return {
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAppointmentById(clinicId: string, appointmentId: string) {
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId, clinic_id: clinicId },
      include: {
        patients: true,
        users: { select: { id: true, full_name_ar: true, role: true } },
        services: true,
        packages: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    return appointment;
  }

  async updateAppointmentStatus(
    clinicId: string,
    appointmentId: string,
    status: string
  ) {
    const appointment = await prisma.appointments.findFirst({
      where: { id: appointmentId, clinic_id: clinicId },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    return prisma.appointments.update({
      where: { id: appointmentId },
      data: { status: status as any },
      include: {
        patients: { select: { id: true, full_name: true, phone: true } },
        services: { select: { id: true, name_ar: true } },
      },
    });
  }
}

export const appointmentService = new AppointmentService();
