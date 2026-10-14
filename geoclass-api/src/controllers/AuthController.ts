import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_geoclass_123';

export class AuthController {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { userCourses: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não cadastrado ou credenciais incorretas.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Senha incorreta. Verifique suas credenciais.' });
      }

      if (user.active === false) {
        return res.status(403).json({ error: 'Sua conta está inativa ou com o curso trancado. Entre em contato com a coordenação.' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' } // Expira em 7 dias
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          courses: typeof user.courses === 'string' ? JSON.parse(user.courses) : (user.courses || []),
          userCourses: user.userCourses || [],
          student_semester: user.student_semester || null,
          active: user.active ?? true,
          privacy_terms_accepted_at: user.privacy_terms_accepted_at
        },
        token
      });
    } catch (error) {
      console.error('Erro no login:', error);
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

