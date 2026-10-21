import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { processExpiredAttendanceSlots } from '../jobs/AbsenceProcessor';
import { isAcademicInstructionalDay } from '../services/CalendarService';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import {
  getBrazilMidnightDate,
  getBrazilDayOfWeek,
  getBrazilDateString,
  evaluateSlotTime,
} from '../utils/dateUtils';
import prisma from '../prisma';

export class StudentController {
  async getAulasHoje(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const now = new Date();
      const todayDate = getBrazilMidnightDate(now);
      const todayStr = getBrazilDateString(now);
      const currentDayName = getBrazilDayOfWeek(now);

      // 0. Se hoje não for dia letivo (feriado, recesso, etc.), nenhuma aula é exibida
      const calendarCheck = await isAcademicInstructionalDay(now);
      if (!calendarCheck.isInstructional) {
        return res.json([]);
      }

      // Garantir que slots expirados tenham faltas devidamente registradas e falsos positivos limpos
      await processExpiredAttendanceSlots(now);

      const enrollments = await prisma.enrollment.findMany({
        where: { student_id: studentId },
        include: {
          class: {
            include: {
              professor: { select: { name: true } },
              room: true,
              course: true,
              temporaryLocs: {
                where: { date: todayDate },
                include: { room: true }
              }
            }
          }
        }
      });

      const filteredEnrollments = enrollments.filter((e) => {
        if (!e.class.week_days) return true;
        const normalizedWeekDays = e.class.week_days
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const days = normalizedWeekDays.split(',').map((d) => d.trim());
        return days.some((d) => d.includes(currentDayName) || currentDayName.includes(d));
      });

      const aulas = await Promise.all(filteredEnrollments.map(async (e) => {
        const c = e.class;
        const tempLoc = c.temporaryLocs && c.temporaryLocs.length > 0 ? c.temporaryLocs[0] : null;
        
        const todaySlots = getScheduleSlotsForDay(c.schedule_time, c.week_days, currentDayName);
        const formattedTime = todaySlots.length > 0 ? todaySlots.join(', ') : c.schedule_time;

        const allAttendancesToday = await prisma.attendance.findMany({
          where: {
            student_id: studentId,
            class_id: c.id,
            date: todayDate,
          },
          orderBy: { check_in_time: 'asc' }
        });

        // Avaliar status de cada slot hoje no Horário de Brasília
        let hasActiveSlot = false;
        let checkedInActiveSlot = false;
        let anyFutureSlot = false;
        let allSlotsExpired = todaySlots.length > 0;
        let anyPresentToday = false;
        let anyAbsentToday = false;

        for (const slot of todaySlots) {
          const { isActive, isExpired, isFuture } = evaluateSlotTime(slot, now);
          const slotAtt = allAttendancesToday.find((a) => a.slot_time === slot);
          const isSlotPresent = slotAtt ? (slotAtt.status === 'PRESENTE' || slotAtt.status === 'ATRASADO') : false;
          const isSlotAbsent = slotAtt ? slotAtt.status === 'FALTA' : false;

          if (isSlotPresent) anyPresentToday = true;
          if (isSlotAbsent) anyAbsentToday = true;

          if (isActive) {
            hasActiveSlot = true;
            if (isSlotPresent) checkedInActiveSlot = true;
          }

          if (isFuture) {
            anyFutureSlot = true;
            allSlotsExpired = false;
          }

          if (!isExpired) {
            allSlotsExpired = false;
          }
        }

        let alreadyCheckedIn = false;
        let isAbsent = false;

        if (hasActiveSlot) {
          // Chamada aberta no momento: se já bateu, presença confirmada; se não, libera botão
          alreadyCheckedIn = checkedInActiveSlot;
          isAbsent = false;
        } else if (anyFutureSlot) {
          // Ainda há chamadas por vir hoje (ex: 18:40 antes das 19:00, ou intervalo entre aulas)
          // NUNCA trava como falta antes da aula começar
          alreadyCheckedIn = anyPresentToday;
          isAbsent = false;
        } else if (allSlotsExpired) {
          // Todas as aulas do dia já terminaram
          if (anyPresentToday) {
            alreadyCheckedIn = true;
            isAbsent = false;
          } else {
            alreadyCheckedIn = false;
            isAbsent = true;
          }
        } else {
          alreadyCheckedIn = anyPresentToday;
          isAbsent = anyAbsentToday && !anyPresentToday;
        }
        
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            student_id_class_id: {
              student_id: studentId,
              class_id: c.id
            }
          }
        });

        const userCourse = c.course_id ? await prisma.userCourse.findUnique({
          where: {
            user_id_course_id: {
              user_id: studentId,
              course_id: c.course_id
            }
          }
        }) : null;

        const isCourseCompleted = userCourse?.is_completed || enrollment?.is_completed || false;

        const lastAttendance = allAttendancesToday.length > 0 ? allAttendancesToday[allAttendancesToday.length - 1] : null;

        const effectiveRoom = tempLoc?.room || c.room;

        return {
          id: c.id,
          subject: c.subject,
          course_name: c.course?.name || null,
          professor: c.professor.name,
          time: formattedTime,
          room: effectiveRoom ? effectiveRoom.name : 'Sala Padrão',
          latitude: effectiveRoom ? effectiveRoom.latitude : 0,
          longitude: effectiveRoom ? effectiveRoom.longitude : 0,
          radiusMeters: c.radius_meters,
          alreadyCheckedIn,
          isAbsent,
          attendanceStatus: lastAttendance?.status || null,
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
        
        const faltas = await prisma.attendance.count({
          where: {
            student_id: studentId,
            class_id: e.class.id,
            status: 'FALTA'
          }
        });

        // Percentual de presença decrescente a partir de 100% conforme a quantidade de ausências
        const absencePercentage = totalClasses === 0 ? 0 : Math.round((faltas / totalClasses) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);
        
        let status = 'Aprovado';
        if (attendancePercentage < 60) status = 'Reprovado';
        else if (attendancePercentage < 75) status = 'Em Risco';

        return {
          id: e.class.id,
          subject: e.class.subject,
          attendancePercentage,
          absencePercentage,
          status,
          attendedClasses: Math.max(0, totalClasses - faltas),
          absentClasses: faltas,
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
        orderBy: [
          { date: 'desc' },
          { check_in_time: 'desc' },
          { id: 'desc' }
        ],
        include: { class: true },
        take: 50 // Limite para paginação
      });

      const historico = attendances.map(a => {
        // a.date representa a data civil da aula (@db.Date no PostgreSQL, normalizada em UTC)
        const dateObj = a.date instanceof Date ? a.date : (a.date ? new Date(a.date) : a.check_in_time);
        const localDateStr = dateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        const localTimeStr = a.slot_time || a.check_in_time.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

        return {
          id: a.id,
          subject: a.class.subject,
          date: localDateStr,
          time: localTimeStr,
          status: a.status,
          _rawDate: a.date,
          _rawCheckIn: a.check_in_time
        };
      });

      // Ordenar explicitamente do mais recente para o mais antigo:
      // 1. Data da aula (mais recente primeiro)
      // 2. Horário do check-in / slot (mais recente primeiro)
      // 3. ID (decrescente)
      historico.sort((a, b) => {
        const timeA = new Date(a._rawDate).getTime();
        const timeB = new Date(b._rawDate).getTime();
        if (timeB !== timeA) return timeB - timeA;

        const checkInA = new Date(a._rawCheckIn).getTime();
        const checkInB = new Date(b._rawCheckIn).getTime();
        if (checkInB !== checkInA) return checkInB - checkInA;

        return Number(b.id) - Number(a.id);
      });

      const result = historico.map(({ _rawDate, _rawCheckIn, ...item }) => item);

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  }
}
