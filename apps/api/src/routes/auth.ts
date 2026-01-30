import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { AppError } from '../utils/errors';

const router = Router();

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      throw new AppError('Phone and password are required', 400);
    }

    const user = await prisma.users.findFirst({
      where: { phone },
      include: { clinic: true },
    });

    if (!user || !user.password_hash) {
      throw new AppError('Invalid credentials', 401);
    }

    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.is_active) {
      throw new AppError('Account is deactivated', 403);
    }

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = generateToken({
      userId: user.id,
      clinicId: user.clinic_id,
      role: user.role,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          full_name_ar: user.full_name_ar,
          full_name_en: user.full_name_en,
          role: user.role,
          clinic: {
            id: user.clinic.id,
            name_ar: user.clinic.name_ar,
            name_en: user.clinic.name_en,
          },
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register (for clinic admin - creates clinic and admin user)
router.post('/register', async (req, res, next) => {
  try {
    const {
      clinicNameAr,
      clinicNameEn,
      clinicPhone,
      clinicEmail,
      adminName,
      adminPhone,
      adminEmail,
      adminPassword,
    } = req.body;

    // Check if phone already exists
    const existingUser = await prisma.users.findFirst({
      where: { phone: adminPhone },
    });

    if (existingUser) {
      throw new AppError('Phone number already registered', 409);
    }

    // Create clinic
    const clinic = await prisma.clinics.create({
      data: {
        name_ar: clinicNameAr,
        name_en: clinicNameEn,
        subdomain: clinicNameEn?.toLowerCase().replace(/\s+/g, '-') || `clinic-${Date.now()}`,
        phone: clinicPhone,
        email: clinicEmail,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      },
    });

    // Create admin user
    const hashedPassword = await hashPassword(adminPassword);

    const user = await prisma.users.create({
      data: {
        clinic_id: clinic.id,
        role: 'admin',
        phone: adminPhone,
        email: adminEmail,
        password_hash: hashedPassword,
        full_name_ar: adminName,
        full_name_en: adminName,
      },
    });

    const token = generateToken({
      userId: user.id,
      clinicId: clinic.id,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          full_name_ar: user.full_name_ar,
          role: user.role,
        },
        clinic: {
          id: clinic.id,
          name_ar: clinic.name_ar,
          name_en: clinic.name_en,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    // This would need the authenticate middleware
    // For now, just a placeholder
    res.json({ success: true, message: 'Use /login to get user info' });
  } catch (error) {
    next(error);
  }
});

export default router;
