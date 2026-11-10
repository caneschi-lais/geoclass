import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../prisma';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

      // Se for Coordenador, filtra as notificações pelo curso que ele coordena
      if (userRole === 'COORDENADOR') {
        const coordCourses = await prisma.userCourse.findMany({
          where: { user_id: userId },
          select: { course_id: true }
        });
        const coordCourseIds = coordCourses.map(uc => uc.course_id);

        if (coordCourseIds.length > 0) {
          const students = await prisma.user.findMany({
            where: { role: 'ALUNO' },
            select: {
              name: true,
              userCourses: { select: { course_id: true } },
              enrollments: { select: { class: { select: { course_id: true } } } }
            }
          });

          const classes = await prisma.class.findMany({
            select: { subject: true, course_id: true }
          });

          const filtered = notifications.filter(n => {
            // 1. Risco de Evasão por Aluno
            if (n.title.startsWith('Risco de Evasão:')) {
              const studentName = n.title.replace('Risco de Evasão:', '').trim();
              const std = students.find(s => s.name.toLowerCase() === studentName.toLowerCase());
              if (!std) return false;
              const stdCourses = [
                ...std.userCourses.map(uc => uc.course_id),
                ...std.enrollments.map(e => e.class.course_id).filter((id): id is number => id !== null)
              ];
              return stdCourses.some(cId => coordCourseIds.includes(cId));
            }

            // 2. Absenteísmo Elevado por Turma
            if (n.title.startsWith('Absenteísmo Elevado:')) {
              const subject = n.title.replace('Absenteísmo Elevado:', '').trim();
              const cls = classes.find(c => c.subject.toLowerCase() === subject.toLowerCase());
              if (!cls || !cls.course_id) return false;
              return coordCourseIds.includes(cls.course_id);
            }

            // 3. Aviso de Falta ou Atestado Médico de Professor
            if (n.title.includes('Aviso de Falta:') || n.title.includes('Atestado Enviado:')) {
              const matchingClass = classes.find(c => n.body.includes(c.subject));
              if (matchingClass && matchingClass.course_id) {
                return coordCourseIds.includes(matchingClass.course_id);
              }
            }

            return true;
          });

          return res.json(filtered);
        }
      }

      return res.json(notifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const { id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      if (id) {
        // Marca uma notificação específica como lida
        await prisma.notification.updateMany({
          where: {
            id,
            user_id: userId
          },
          data: { read: true }
        });
      } else {
        // Marca todas as notificações do usuário como lidas
        await prisma.notification.updateMany({
          where: {
            user_id: userId,
            read: false
          },
          data: { read: true }
        });
      }

      return res.json({ message: 'Notificações marcadas como lidas com sucesso' });
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error);
      return res.status(500).json({ error: 'Erro ao marcar notificações como lidas' });
    }
  }

  async savePushToken(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Push token inválido' });
    }

    try {
      await prisma.user.update({
        where: { id: userId },
        data: { push_token: token },
      });

      console.log(`📲 [PUSH TOKEN SALVO] Usuário ${userId} registrou token: ${token.substring(0, 25)}...`);
      return res.json({ message: 'Push token salvo com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar push token:', error);
      return res.status(500).json({ error: 'Erro ao salvar push token' });
    }
  }
}
