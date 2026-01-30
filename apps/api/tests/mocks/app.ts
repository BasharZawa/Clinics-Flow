/**
 * Mock Express App for Integration Tests
 */

import express from 'express';

const app = express();
app.use(express.json());

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

export { app };
