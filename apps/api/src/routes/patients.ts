import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { patientService } from '../services/patient.service';
import { AppError } from '../utils/errors';
import { parseISO } from 'date-fns';

const router = Router();

// Search patients
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q, limit } = req.query;

    if (!q) {
      throw new AppError('Search query is required', 400);
    }

    const patients = await patientService.searchPatients(
      req.user!.clinicId,
      q as string,
      limit ? parseInt(limit as string) : undefined
    );

    res.json({ success: true, data: patients });
  } catch (error) {
    next(error);
  }
});

// Get patients list
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;

    const result = await patientService.getPatients(req.user!.clinicId, {
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
});

// Create patient
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { fullName, phone, email, dateOfBirth, gender, address, notes } =
      req.body;

    const patient = await patientService.createPatient(req.user!.clinicId, {
      fullName,
      phone,
      email,
      dateOfBirth: dateOfBirth ? parseISO(dateOfBirth) : undefined,
      gender,
      address,
      notes,
    });

    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// Get patient by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(
      req.user!.clinicId,
      req.params.id
    );

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

// Get patient history
router.get('/:id/history', authenticate, async (req, res, next) => {
  try {
    const history = await patientService.getPatientHistory(
      req.user!.clinicId,
      req.params.id
    );

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
});

// Update patient
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { fullName, phone, email, dateOfBirth, gender, address, notes } =
      req.body;

    const patient = await patientService.updatePatient(
      req.user!.clinicId,
      req.params.id,
      {
        fullName,
        phone,
        email,
        dateOfBirth: dateOfBirth ? parseISO(dateOfBirth) : undefined,
        gender,
        address,
        notes,
      }
    );

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
});

export default router;
