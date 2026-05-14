import jwt from 'jsonwebtoken';

export function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '7d' });
}
