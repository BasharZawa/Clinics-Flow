import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { appointmentService } from '../services/appointment.service';
import { AppError } from '../utils/errors';
import { parseISO, isValid } from 'date-fns';

const router = Router();

// Get appointments list
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { dateFrom, dateTo, staffId, patientId, status, page, limit } =
      req.query;

    const result = await appointmentService.getAppointments(
      req.user!.clinicId,
      {
        dateFrom: dateFrom ? parseISO(dateFrom as string) : undefined,
        dateTo: dateTo ? parseISO(dateTo as string) : undefined,
        staffId: staffId as string,
        patientId: patientId as string,
        status: status as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
});

// Get availability for a date
router.get('/availability', authenticate, async (req, res, next) => {
  try {
    const { date, staffId, serviceId } = req.query;

    if (!date || !serviceId) {
      throw new AppError('Date and serviceId are required', 400);
    }

    const parsedDate = parseISO(date as string);
    if (!isValid(parsedDate)) {
      throw new AppError('Invalid date format', 400);
    }

    const slots = await appointmentService.getAvailability(
      req.user!.clinicId,
      parsedDate,
      staffId as string,
      serviceId as string
    );

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

// Create single appointment
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      patientId,
      staffId,
      serviceId,
      appointmentDate,
      startTime,
      endTime,
      notes,
      patientNotes,
      internalNotes,
    } = req.body;

    const appointment = await appointmentService.createAppointment(
      req.user!.clinicId,
      req.user!.userId,
      {
        patientId,
        staffId,
        serviceId,
        appointmentDate: parseISO(appointmentDate),
        startTime,
        endTime,
        notes,
        patientNotes,
        internalNotes,
        appointmentType: 'single',
      }
    );

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// Create package appointments
router.post('/package', authenticate, async (req, res, next) => {
  try {
    const {
      patientId,
      staffId,
      serviceId,
      startDate,
      startTime,
      totalSessions,
      intervalDays,
      name,
      totalPrice,
      notes,
    } = req.body;

    const result = await appointmentService.createPackage(
      req.user!.clinicId,
      req.user!.userId,
      {
        patientId,
        staffId,
        serviceId,
        startDate: parseISO(startDate),
        startTime,
        totalSessions: parseInt(totalSessions),
        intervalDays: parseInt(intervalDays),
        name,
        totalPrice: totalPrice ? parseFloat(totalPrice) : undefined,
        notes,
      }
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get appointment by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById(
      req.user!.clinicId,
      req.params.id
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// Cancel appointment
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const { reason, checkWaitlist } = req.body;

    const appointment = await appointmentService.cancelAppointment(
      req.user!.clinicId,
      req.params.id,
      reason,
      checkWaitlist
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// Update appointment status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;

    const appointment = await appointmentService.updateAppointmentStatus(
      req.user!.clinicId,
      req.params.id,
      status
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

export default router;
