/**
 * Mock Express App for Integration Tests
 */

import express from 'express';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Mock user data
    (req as any).user = {
      userId: 'test-user-123',
      clinicId: 'clinic-test-123',
      role: 'admin',
    };
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

// Mock routes
app.post('/v1/appointments', (req, res) => {
  res.status(201).json({ id: 'mock-appt-123', ...req.body });
});

app.post('/v1/appointments/:id/cancel', (req, res) => {
  res.json({ success: true, id: req.params.id });
});

app.post('/v1/appointments/package', (req, res) => {
  res.status(201).json({ id: 'mock-package-123', ...req.body });
});

app.post('/v1/whatsapp/webhook', (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
});

// Dashboard routes mock responses
app.get('/v1/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      appointments: { today: 12, thisWeek: 45 },
      waitlist: { active: 8, offered: 3, total: 11 },
      whatsapp: { sent: 50, delivered: 48, failed: 2, deliveryRate: 96 },
      patients: { newThisMonth: 15 },
    },
  });
});

app.get('/v1/dashboard/appointments/today', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'appt-1',
        appointment_date: new Date().toISOString(),
        start_time: new Date().toISOString(),
        end_time: new Date().toISOString(),
        status: 'confirmed',
        patient: { full_name: 'أحمد محمد', phone: '+962791234567' },
        service: { name_ar: 'كشف عام', duration_minutes: 30 },
        staff: { full_name_ar: 'د. خالد' },
      },
    ],
  });
});

app.get('/v1/dashboard/waitlist/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      counts: { active: 10, offered: 5, filled: 20, cancelled: 3, total: 38 },
      recentEntries: [
        {
          id: 'wl-1',
          status: 'active',
          priority: 1,
          patient: { full_name: 'محمد أحمد', phone: '+962791111111' },
          service: { name_ar: 'كشف عام' },
        },
      ],
    },
  });
});

app.get('/v1/dashboard/whatsapp/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totals: { sent: 60, delivered: 55, failed: 5 },
      deliveryRate: 92,
      byType: [
        { message_type: 'booking_confirmation', status: 'delivered', _count: { _all: 30 } },
      ],
      recentMessages: [],
    },
  });
});

app.get('/v1/dashboard/activities', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'act-1', type: 'appointment', description: 'حجز موعد', timestamp: new Date().toISOString(), status: 'confirmed' },
      { id: 'act-2', type: 'whatsapp', description: 'إرسال رسالة', timestamp: new Date().toISOString(), status: 'delivered' },
    ],
  });
});

export { app };
