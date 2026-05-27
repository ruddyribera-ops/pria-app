import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const motorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,                   // 20 motor generations per hour per user
  message: { error: 'Límite de generación alcanzado (60/hora). Espera un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user id if authenticated, otherwise IP (via safe helper)
    const user = (req as any).user;
    return user ? `user_${user.id}` : ipKeyGenerator(req.ip || 'unknown');
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 login attempts per minute per IP
  message: { error: 'Demasiados intentos de inicio de sesiÃ³n. Espera un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || 'unknown'),
});

