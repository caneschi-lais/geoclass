import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    name?: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    req.user = {
      id: Number(decoded.id),
      role: decoded.role,
      name: decoded.name
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
