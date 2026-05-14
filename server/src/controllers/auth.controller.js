import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/appError.js';
import { signToken } from '../utils/token.js';

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  email: z.string().trim().email('Please enter a valid email.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100)
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email.'),
  password: z.string().min(1, 'Password is required.')
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email.')
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(40, 'Reset token is invalid.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').max(100)
});

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new AppError('Email is already registered.', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, email, password: hashedPassword }
    });

    res.status(201).json({ success: true, token: signToken(user.id), user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });

    if (!user) throw new AppError('Invalid email or password.', 401);
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) throw new AppError('Invalid email or password.', 401);

    res.json({ success: true, token: signToken(user.id), user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const data = forgotPasswordSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    // Same generic success response for unknown emails prevents user enumeration.
    const response = {
      success: true,
      message: 'If this email is registered, a password reset link has been generated.'
    };

    if (!user) return res.json(response);

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { tokenHash, expiresAt, userId: user.id }
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl.replace(/\/$/, '')}/reset-password?token=${token}`;

    // Demo mode: the app has no email provider, so the link is returned to the UI.
    // In production, connect SendGrid/Mailgun/Nodemailer and email resetUrl instead.
    res.json({ ...response, resetUrl, expiresInMinutes: 15 });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const data = resetPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(data.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new AppError('Reset link is invalid or expired. Please request a new one.', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() }
      })
    ]);

    res.json({ success: true, message: 'Password reset successfully. You can login with your new password.' });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  res.json({ success: true, user: req.user });
}
