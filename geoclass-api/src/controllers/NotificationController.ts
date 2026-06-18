import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const notifications = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' }
      });

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
}
