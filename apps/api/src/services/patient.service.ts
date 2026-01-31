import { prisma } from '../utils/prisma';
import { AppError } from '../utils/errors';

export interface CreatePatientInput {
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female';
  address?: string;
  notes?: string;
}

export class PatientService {
  async createPatient(clinicId: string, data: CreatePatientInput) {
    // Check if patient already exists
    const existing = await prisma.patient.findFirst({
      where: {
        clinic_id: clinicId,
        phone: data.phone,
      },
    });

    if (existing) {
      throw new AppError(
        'Patient with this phone already exists',
        409,
        'PATIENT_EXISTS'
      );
    }

    return prisma.patient.create({
      data: {
        clinic_id: clinicId,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        notes: data.notes,
      },
    });
  }

  async searchPatients(clinicId: string, query: string, limit: number = 20) {
    return prisma.patient.findMany({
      where: {
        clinic_id: clinicId,
        OR: [
          { full_name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { created_at: 'desc' },
    });
  }

  async getPatientById(clinicId: string, patientId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    return patient;
  }

  async getPatientHistory(clinicId: string, patientId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
      include: {
        appointments: {
          include: {
            service: { select: { name_ar: true, name_en: true } },
            staff: { select: { full_name_ar: true } },
          },
          orderBy: { appointment_date: 'desc' },
        },
        packages: {
          include: {
            service: { select: { name_ar: true } },
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    return patient;
  }

  async updatePatient(
    clinicId: string,
    patientId: string,
    data: Partial<CreatePatientInput>
  ) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinic_id: clinicId },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Check phone uniqueness if changing phone
    if (data.phone && data.phone !== patient.phone) {
      const existing = await prisma.patient.findFirst({
        where: {
          clinic_id: clinicId,
          phone: data.phone,
          NOT: { id: patientId },
        },
      });

      if (existing) {
        throw new AppError(
          'Another patient with this phone already exists',
          409,
          'PHONE_EXISTS'
        );
      }
    }

    return prisma.patient.update({
      where: { id: patientId },
      data: {
        full_name: data.fullName,
        phone: data.phone,
        email: data.email,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        address: data.address,
        notes: data.notes,
      },
    });
  }

  async getPatients(
    clinicId: string,
    options: { page?: number; limit?: number; search?: string }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { clinic_id: clinicId };

    if (options.search) {
      where.OR = [
        { full_name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ]);

    return {
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const patientService = new PatientService();
