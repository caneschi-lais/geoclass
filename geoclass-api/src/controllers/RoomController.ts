import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import prisma from '../prisma';

export class RoomController {
  // Retorna todas as salas disponíveis para um dado horário e data
  async getAvailableRooms(req: AuthRequest, res: Response) {
    const { date, schedule_time } = req.query;

    if (!date || !schedule_time) {
      return res.status(400).json({ error: 'Data e horário são obrigatórios' });
    }

    try {
      // 1. Pega todas as salas
      const allRooms = await prisma.room.findMany();

      // 2. Verifica as turmas regulares (salas padrão) ativas que ocorrem neste horário
      const classesAtSameTime = await prisma.class.findMany({
        where: { schedule_time: String(schedule_time), active: true },
        select: { room_id: true, id: true }
      });

      // 3. Verifica as salas temporárias já agendadas para essa data
      const targetDate = new Date(String(date).includes('T') ? String(date) : `${date}T12:00:00Z`);
      const targetDateMidnight = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate()));

      const temporaryLocsAtDate = await prisma.temporaryClassLocation.findMany({
        where: { date: targetDateMidnight },
        include: { class: true }
      });

      // Filtra apenas as temporárias que caem no MESMO horário
      const busyTemporaryLocs = temporaryLocsAtDate.filter(loc => loc.class.schedule_time === String(schedule_time));

      // 4. Filtrar as salas disponíveis
      const availableRooms = allRooms.filter(room => {
        const isStandardOccupied = classesAtSameTime.some(c => {
          if (c.room_id === room.id) {
            // Verifica se a turma c TEM uma sala temporária hoje (se tiver, essa sala padrão fica livre!)
            const classHasTemporaryLocation = temporaryLocsAtDate.some(t => t.class_id === c.id);
            return !classHasTemporaryLocation; 
          }
          return false;
        });

        // A sala está ocupada de forma temporária se alguém marcou pra cá
        const isTemporarilyOccupied = busyTemporaryLocs.some(loc => loc.room_id === room.id);

        return !isStandardOccupied && !isTemporarilyOccupied;
      });

      return res.json(availableRooms);
    } catch (error) {
      console.error('Erro getAvailableRooms', error);
      return res.status(500).json({ error: 'Erro interno ao buscar salas' });
    }
  }
}
