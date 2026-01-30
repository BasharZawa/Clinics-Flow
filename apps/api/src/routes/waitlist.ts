import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { waitlistService } from '../services/waitlist.service';
import { AppError } from '../utils/errors';
import { parseISO } from 'date-fns';

const router = Router();

// Get waitlist
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, serviceId, page, limit } = req.query;

    const result = await waitlistService.getWaitlist(req.user!.clinicId, {
      status: status as string,
      serviceId: serviceId as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
});

// Get waitlist stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await waitlistService.getWaitlistStats(req.user!.clinicId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// Add to waitlist
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      patientId,
      serviceId,
      preferredStaffId,
      preferredDateStart,
      preferredDateEnd,
      preferredTimeStart,
      preferredTimeEnd,
      preferredDaysOfWeek,
      priority,
      notes,
    } = req.body;

    const entry = await waitlistService.addToWaitlist(
      req.user!.clinicId,
      req.user!.userId,
      {
        patientId,
        serviceId,
        preferredStaffId,
        preferredDateStart: preferredDateStart
          ? parseISO(preferredDateStart)
          : undefined,
        preferredDateEnd: preferredDateEnd
          ? parseISO(preferredDateEnd)
          : undefined,
        preferredTimeStart,
        preferredTimeEnd,
        preferredDaysOfWeek,
        priority,
        notes,
      }
    );

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

// Accept waitlist offer (create appointment from waitlist)
router.post('/:id/accept', authenticate, async (req, res, next) => {
  try {
    const { date, time } = req.body;

    if (!date || !time) {
      throw new AppError('Date and time are required', 400);
    }

    const appointment = await waitlistService.acceptWaitlistOffer(
      req.user!.clinicId,
      req.params.id,
      parseISO(date),
      time
    );

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
});

// Cancel waitlist entry
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const entry = await waitlistService.cancelWaitlist(
      req.user!.clinicId,
      req.params.id
    );

    res.json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
});

export default router;
