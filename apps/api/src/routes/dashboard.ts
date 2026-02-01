import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard overview stats
router.get('/stats', async (req, res, next) => {
  try {
    const { user } = req;
    const clinicId = user!.clinicId;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);

    // Get today's appointments count
    const todayAppointments = await prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        appointment_date: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { in: ['confirmed', 'pending'] },
      },
    });

    // Get this week's appointments
    const weekAppointments = await prisma.appointment.count({
      where: {
        clinic_id: clinicId,
        appointment_date: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: { in: ['confirmed', 'completed'] },
      },
    });

    // Get active waitlist count
    const waitlistCount = await prisma.waitlist.count({
      where: {
        clinic_id: clinicId,
        status: 'active',
      },
    });

    // Get offered waitlist count
    const waitlistOffered = await prisma.waitlist.count({
      where: {
        clinic_id: clinicId,
        status: 'offered',
      },
    });

    // Get WhatsApp messages stats (last 24 hours)
    const yesterday = subDays(today, 1);
    const whatsappStats = await prisma.whatsappLog.groupBy({
      by: ['status'],
      where: {
        clinic_id: clinicId,
        sent_at: {
          gte: yesterday,
        },
      },
      _count: {
        status: true,
      },
    });

    const whatsappSent = whatsappStats.find(s => s.status === 'sent')?._count.status || 0;
    const whatsappDelivered = whatsappStats.find(s => s.status === 'delivered')?._count.status || 0;
    const whatsappFailed = whatsappStats.find(s => s.status === 'failed')?._count.status || 0;

    // Get new patients this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const newPatients = await prisma.patient.count({
      where: {
        clinic_id: clinicId,
        created_at: {
          gte: monthStart,
        },
      },
    });

    res.json({
      success: true,
      data: {
        appointments: {
          today: todayAppointments,
          thisWeek: weekAppointments,
        },
        waitlist: {
          active: waitlistCount,
          offered: waitlistOffered,
          total: waitlistCount + waitlistOffered,
        },
        whatsapp: {
          sent: whatsappSent,
          delivered: whatsappDelivered,
          failed: whatsappFailed,
          deliveryRate: whatsappSent > 0 
            ? Math.round((whatsappDelivered / whatsappSent) * 100) 
            : 0,
        },
        patients: {
          newThisMonth: newPatients,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get today's appointments list
router.get('/appointments/today', async (req, res, next) => {
  try {
    const { user } = req;
    const clinicId = user!.clinicId;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    const appointments = await prisma.appointment.findMany({
      where: {
        clinic_id: clinicId,
        appointment_date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            full_name: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            name_ar: true,
            name_en: true,
            duration_minutes: true,
          },
        },
        staff: {
          select: {
            id: true,
            full_name_ar: true,
          },
        },
      },
      orderBy: {
        start_time: 'asc',
      },
    });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
});

// Get waitlist stats
router.get('/waitlist/stats', async (req, res, next) => {
  try {
    const { user } = req;
    const clinicId = user!.clinicId;

    const [active, offered, filled, cancelled] = await Promise.all([
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'active' },
      }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'offered' },
      }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'filled' },
      }),
      prisma.waitlist.count({
        where: { clinic_id: clinicId, status: 'cancelled' },
      }),
    ]);

    // Get recent waitlist entries
    const recentEntries = await prisma.waitlist.findMany({
      where: { clinic_id: clinicId },
      include: {
        patient: {
          select: { full_name: true, phone: true },
        },
        service: {
          select: { name_ar: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        counts: {
          active,
          offered,
          filled,
          cancelled,
          total: active + offered + filled + cancelled,
        },
        recentEntries,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get WhatsApp stats
router.get('/whatsapp/stats', async (req, res, next) => {
  try {
    const { user } = req;
    const clinicId = user!.clinicId;
    const { range = '7d' } = req.query;

    let startDate: Date;
    const today = new Date();

    switch (range) {
      case '24h':
        startDate = subDays(today, 1);
        break;
      case '7d':
        startDate = subDays(today, 7);
        break;
      case '30d':
        startDate = subDays(today, 30);
        break;
      default:
        startDate = subDays(today, 7);
    }

    // Get stats by message type
    const messageStats = await prisma.whatsappLog.groupBy({
      by: ['message_type', 'status'],
      where: {
        clinic_id: clinicId,
        sent_at: {
          gte: startDate,
        },
      },
      _count: {
        _all: true,
      },
    });

    // Get recent messages
    const recentMessages = await prisma.whatsappLog.findMany({
      where: { clinic_id: clinicId },
      orderBy: { sent_at: 'desc' },
      take: 20,
    });

    // Calculate totals
    const totals = messageStats.reduce(
      (acc, curr) => {
        if (curr.status === 'sent') acc.sent += curr._count._all;
        if (curr.status === 'delivered') acc.delivered += curr._count._all;
        if (curr.status === 'failed') acc.failed += curr._count._all;
        return acc;
      },
      { sent: 0, delivered: 0, failed: 0 }
    );

    res.json({
      success: true,
      data: {
        totals,
        deliveryRate: totals.sent > 0 
          ? Math.round((totals.delivered / totals.sent) * 100) 
          : 0,
        byType: messageStats,
        recentMessages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get recent activities
router.get('/activities', async (req, res, next) => {
  try {
    const { user } = req;
    const clinicId = user!.clinicId;

    // Get recent appointments
    const recentAppointments = await prisma.appointment.findMany({
      where: { clinic_id: clinicId },
      include: {
        patient: { select: { full_name: true } },
        service: { select: { name_ar: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    // Get recent WhatsApp messages
    const recentMessages = await prisma.whatsappLog.findMany({
      where: { clinic_id: clinicId },
      orderBy: { sent_at: 'desc' },
      take: 5,
    });

    // Combine and format activities
    const activities = [
      ...recentAppointments.map(apt => ({
        id: `apt-${apt.id}`,
        type: 'appointment' as const,
        description: `حجز موعد جديد - ${apt.patient.full_name}`,
        service: apt.service.name_ar,
        timestamp: apt.created_at || new Date(),
        status: apt.status,
      })),
      ...recentMessages.map(msg => ({
        id: `msg-${msg.id}`,
        type: 'whatsapp' as const,
        description: `إرسال رسالة واتساب`,
        phone: msg.phone,
        timestamp: msg.sent_at || new Date(),
        status: msg.status,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 10);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
