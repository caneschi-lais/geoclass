import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export class StudentController {
  async getAulasHoje(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;

    try {
      const todayStr = new Date().toISOString().split('T')[0];

      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: studentId },
        include: {
          class: {
            include: {
              professor: { select: { name: true } },
              temporaryLocs: {
                where: { date: todayStr }
              }
            }
          }
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const aulas = await Promise.all(enrollments.map(async (e) => {
        const c = e.class;
        const tempLoc = c.temporaryLocs && c.temporaryLocs.length > 0 ? c.temporaryLocs[0] : null;
        
        const attendanceExists = await prisma.attendance.findFirst({
          where: {
            student_id: studentId,
            class_id: c.id,
            date: today,
            status: 'PRESENTE'
          }
        });
        
        return {
          id: c.id,
          subject: c.subject,
          professor: c.professor.name,
          time: c.schedule_time,
          room: tempLoc ? tempLoc.room_name : c.room_name,
          latitude: tempLoc ? tempLoc.latitude : c.latitude,
          longitude: tempLoc ? tempLoc.longitude : c.longitude,
          radiusMeters: c.radius_meters,
          alreadyCheckedIn: attendanceExists !== null
        };
      }));

      return res.json(aulas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar aulas de hoje' });
    }
  }

  async getDashboard(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;

    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: studentId },
        include: { class: true }
      });

      const stats = await Promise.all(enrollments.map(async (e) => {
        // Lógica simplificada: Total de aulas dadas = 20 (fixo para o MVP, ideal seria contar dias desde o inicio do semestre)
        const totalAulasDadas = 20; 
        
        const presencas = await prisma.attendance.count({
          where: {
            student_id: studentId,
            class_id: e.class.id,
            status: 'PRESENTE'
          }
        });

        const percentage = Math.round((presencas / totalAulasDadas) * 100);
        
        let status = 'Aprovado';
        if (percentage < 75 && percentage >= 60) status = 'Em Risco';
        else if (percentage < 60) status = 'Reprovado';

        return {
          id: e.class.id,
          subject: e.class.subject,
          attendancePercentage: percentage,
          status
        };
      }));

      return res.json(stats);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar dashboard' });
    }
  }

  async getHistorico(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;

    try {
      const attendances = await prisma.attendance.findMany({
        where: { student_id: studentId },
        orderBy: { date: 'desc' },
        include: { class: true },
        take: 50 // Limite para paginação
      });

      const historico = attendances.map(a => {
        const [year, month, day] = a.date.toISOString().split('T')[0].split('-');
        return {
          id: a.id,
          subject: a.class.subject,
          date: `${day}/${month}/${year}`,
          time: a.check_in_time.toISOString().split('T')[1].substring(0, 5)
        };
      });

      return res.json(historico);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
}
