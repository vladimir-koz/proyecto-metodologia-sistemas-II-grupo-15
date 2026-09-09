import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserAttributes } from '../models/User';
import { AuthUserPayload } from '../types/auth.types';

function getRequiredJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('La variable de entorno JWT_SECRET es obligatoria');
  }

  return secret;
}

const JWT_SECRET = getRequiredJwtSecret();

export function generarToken(user: Pick<UserAttributes, 'id' | 'email'>): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verificarToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Token no proporcionado' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Formato de token invalido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded === 'string' || !decoded.id || !decoded.email) {
      res.status(401).json({ error: 'Token invalido' });
      return;
    }
    
    const payload = decoded as AuthUserPayload;

    req.user = {
      id: Number(payload.id),
      email: String(payload.email)
    };

    next();
  } catch {
    res.status(401).json({ error: 'Token invalido o expirado' });
  }
}
