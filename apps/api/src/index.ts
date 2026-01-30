import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler, notFoundHandler } from './middleware/error';

// Routes
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import patientRoutes from './routes/patients';
import waitlistRoutes from './routes/waitlist';
import whatsappRoutes from './routes/whatsapp';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/appointments', appointmentRoutes);
app.use('/v1/patients', patientRoutes);
app.use('/v1/waitlist', waitlistRoutes);
app.use('/v1/whatsapp', whatsappRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`);
});

export { app };
