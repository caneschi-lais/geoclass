import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { processExpiredAttendanceSlots } from '../jobs/AbsenceProcessor';
import { isAcademicInstructionalDay } from '../services/CalendarService';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import prisma from '../prisma';

export class StudentController {
  async getAulasHoje(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const now = new Date();

      // 0. Se hoje não for dia letivo (feriado, recesso, etc.), nenhuma aula é exibida
      const calendarCheck = await isAcademicInstructionalDay(now);
      if (!calendarCheck.isInstructional) {
        return res.json([]);
      }

      // Garantir que slots expirados tenham faltas devidamente registradas
      await processExpiredAttendanceSlots(now);

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

      const daysOfWeekMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
      const currentDayName = daysOfWeekMap[today.getDay()];

      const filteredEnrollments = enrollments.filter((e) => {
        if (!e.class.week_days) return true;
        const days = e.class.week_days.toLowerCase().split(',').map((d) => d.trim());
        return days.includes(currentDayName);
      });

      const aulas = await Promise.all(filteredEnrollments.map(async (e) => {
        const c = e.class;
        const tempLoc = c.temporaryLocs && c.temporaryLocs.length > 0 ? c.temporaryLocs[0] : null;
        
        const attendanceExists = await prisma.attendance.findFirst({
          where: {
            student_id: studentId,
            class_id: c.id,
            date: today,
          },
          orderBy: { check_in_time: 'desc' }
        });

        const alreadyCheckedIn = attendanceExists?.status === 'PRESENTE' || attendanceExists?.status === 'ATRASADO';
        const isAbsent = attendanceExists?.status === 'FALTA';
        
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            student_id_class_id: {
              student_id: studentId,
              class_id: c.id
            }
          }
        });

        const userCourse = c.course_name ? await prisma.userCourse.findUnique({
          where: {
            user_id_course_name: {
              user_id: studentId,
              course_name: c.course_name
            }
          }
        }) : null;

        const isCourseCompleted = userCourse?.is_completed || enrollment?.is_completed || false;

        const todaySlots = getScheduleSlotsForDay(c.schedule_time, c.week_days, currentDayName);
        const formattedTime = todaySlots.length > 0 ? todaySlots.join(', ') : c.schedule_time;

        return {
          id: c.id,
          subject: c.subject,
          course_name: c.course_name,
          professor: c.professor.name,
          time: formattedTime,
          room: tempLoc ? tempLoc.room_name : c.room_name,
          latitude: tempLoc ? tempLoc.latitude : c.latitude,
          longitude: tempLoc ? tempLoc.longitude : c.longitude,
          radiusMeters: c.radius_meters,
          alreadyCheckedIn,
          isAbsent,
          attendanceStatus: attendanceExists?.status || null,
          isCourseCompleted
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
        const totalClasses = e.class.total_classes || 40; 
        
        const presencas = await prisma.attendance.count({
          where: {
            student_id: studentId,
            class_id: e.class.id,
            status: { in: ['PRESENTE', 'PRESENCA_PARCIAL'] } as any
          }
        });

        const percentage = Math.round((presencas / totalClasses) * 100);
        
        let status = 'Aprovado';
        if (percentage < 75 && percentage >= 60) status = 'Em Risco';
        else if (percentage < 60) status = 'Reprovado';

        return {
          id: e.class.id,
          subject: e.class.subject,
          attendancePercentage: percentage,
          status,
          attendedClasses: presencas,
          totalClasses
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
        const localDateStr = a.check_in_time.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const localTimeStr = a.check_in_time.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

        return {
          id: a.id,
          subject: a.class.subject,
          date: localDateStr,
          time: localTimeStr,
          status: a.status
        };
      });

      return res.json(historico);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
}
