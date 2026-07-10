import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_geoclass_123';

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' } // Expira em 7 dias
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          privacy_terms_accepted_at: user.privacy_terms_accepted_at
        },
        token
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }

  async acceptPrivacyTerms(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { privacy_terms_accepted_at: new Date() },
      });

      return res.json({
        success: true,
        privacy_terms_accepted_at: updatedUser.privacy_terms_accepted_at,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao aceitar termos de privacidade' });
    }
  }
}

