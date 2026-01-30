/**
 * Patient Service Unit Tests
 */

import { PatientService } from '../../src/services/patient.service';
import { prismaMock } from '../mocks/prisma';

describe('PatientService', () => {
  let service: PatientService;
  const mockClinicId = 'clinic-123';

  beforeEach(() => {
    service = new PatientService();
    jest.clearAllMocks();
  });

  describe('createPatient', () => {
    it('should create new patient', async () => {
      const patientData = {
        fullName: 'محمد أحمد',
        phone: '+962795716713',
        email: 'test@example.com',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male' as const,
        address: 'عمان',
        notes: 'حساسية',
      };

      prismaMock.patients.findFirst.mockResolvedValue(null); // Not exists
      prismaMock.patients.create.mockResolvedValue({
        id: 'patient-123',
        ...patientData,
      } as any);

      const result = await service.createPatient(mockClinicId, patientData);

      expect(result).toBeDefined();
      expect(result.id).toBe('patient-123');
    });

    it('should throw error if phone already exists', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({
        id: 'existing-patient',
      } as any);

      await expect(
        service.createPatient(mockClinicId, {
          fullName: 'Test',
          phone: '+962795716713',
        })
      ).rejects.toThrow('Patient with this phone already exists');
    });
  });

  describe('searchPatients', () => {
    it('should search by name', async () => {
      prismaMock.patients.findMany.mockResolvedValue([
        { id: 'p1', full_name: 'محمد أحمد', phone: '+111' },
        { id: 'p2', full_name: 'محمد خالد', phone: '+222' },
      ] as any);

      const results = await service.searchPatients(mockClinicId, 'محمد');

      expect(results).toHaveLength(2);
    });

    it('should search by phone', async () => {
      prismaMock.patients.findMany.mockResolvedValue([
        { id: 'p1', full_name: 'Test', phone: '+962795716713' },
      ] as any);

      const results = await service.searchPatients(mockClinicId, '795716713');

      expect(results).toHaveLength(1);
    });
  });

  describe('getPatientHistory', () => {
    it('should return patient with full history', async () => {
      prismaMock.patients.findFirst.mockResolvedValue({
        id: 'patient-123',
        full_name: 'محمد',
        appointments: [
          { id: 'a1', status: 'completed', services: { name_ar: 'ليزر' } },
        ],
        packages: [
          { id: 'pkg1', name: 'حزمة 1', status: 'active' },
        ],
      } as any);

      const result = await service.getPatientHistory(mockClinicId, 'patient-123');

      expect(result.appointments).toHaveLength(1);
      expect(result.packages).toHaveLength(1);
    });
  });
});
