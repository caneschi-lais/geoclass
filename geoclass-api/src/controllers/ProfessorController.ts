import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import { sendPushNotification } from '../services/pushNotificationService';
import prisma from '../prisma';

function parseCourses(courses: any): string[] {
  if (!courses) return [];
  if (Array.isArray(courses)) return courses;
  if (typeof courses === 'string') {
    try { return JSON.parse(courses); } catch { return [courses]; }
  }
  return [];
}

function resolveClassSlots(
  scheduleTime?: string | null,
  weekDays?: string | null,
  targetDate?: Date | string | null
): string[] {
  return getScheduleSlotsForDay(scheduleTime, weekDays, targetDate);
}

export class ProfessorController {
  async getTurmas(req: AuthRequest, res: Response) {
    const professorId = req.user?.id;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const classes = await prisma.class.findMany({
        where: { professor_id: professorId },
        include: {
          temporaryLocs: {
            where: { date: todayStr }
          },
          _count: {
            select: { enrollments: true }
          }
        }
      });

      const turmas = classes.map(c => {
        const tempRoom = c.temporaryLocs && c.temporaryLocs.length > 0 ? c.temporaryLocs[0].room_name : null;
        return {
          id: c.id,
          subject: c.subject,
          time: c.schedule_time,
          room: tempRoom || c.room_name,
          enrolledCount: c._count.enrollments
        };
      });

      return res.json(turmas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar turmas' });
    }
  }

  async getPresencasTurma(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { date, status } = req.query as { date?: string; status?: string };

    let targetDate: Date;
    if (date && typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        targetDate = new Date(year, month - 1, day);
      } else {
        targetDate = new Date();
      }
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);

    try {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
          enrollments: {
            where: { is_completed: false },
            include: {
              student: {
                include: { userCourses: true }
              }
            }
          }
        }
      });

      if (!classData) {
        return res.status(404).json({ error: 'Turma não encontrada' });
      }

      // Determinar os horários / slots de aula para o dia específico (respeitando se a matéria tem 2 ou 4 horários no dia)
      const classSlots = resolveClassSlots(classData.schedule_time, classData.week_days, targetDate);

      // Buscar todos os registros de presença da data
      const attendances = await prisma.attendance.findMany({
        where: {
          class_id: classId,
          date: targetDate,
        },
        include: {
          student: {
            include: { userCourses: true }
          }
        },
        orderBy: {
          check_in_time: 'asc'
        }
      });

      // Mapear estudantes únicos a partir das matrículas e presenças
      const studentMap = new Map<string, any>();
      for (const enr of classData.enrollments) {
        const s = enr.student;
        studentMap.set(s.id, {
          id: s.id,
          name: s.name,
          ra: s.ra || 'N/A',
          student_semester: s.student_semester || undefined,
          courses: parseCourses(s.courses),
          userCourses: s.userCourses,
        });
      }
      for (const att of attendances) {
        if (!studentMap.has(att.student.id)) {
          studentMap.set(att.student.id, {
            id: att.student.id,
            name: att.student.name,
            ra: att.student.ra || 'N/A',
            student_semester: att.student.student_semester || undefined,
            courses: parseCourses(att.student.courses),
            userCourses: (att.student as any).userCourses || [],
          });
        }
      }

      // Construir 1 card único por aluno contendo o detalhamento de cada um dos 4 slots
      const studentsList = Array.from(studentMap.values()).map((student) => {
        const studentAttendances = attendances.filter((a) => a.student_id === student.id);
        const deviceAttendance = studentAttendances.find((a) => !!a.device_id);

        const slots = classSlots.map((slotTime, idx) => {
          const slotAtt = studentAttendances.find((a) => a.slot_time === slotTime) 
            || (studentAttendances.length === 1 && studentAttendances[0].slot_time === 'MANUAL' ? studentAttendances[0] : null);

          const isPresent = slotAtt ? (slotAtt.status === 'PRESENTE' || slotAtt.status === 'ATRASADO') : false;
          const slotStatus = slotAtt ? slotAtt.status : 'FALTA';

          return {
            slot_index: idx + 1,
            slot_time: slotTime,
            label: `${idx + 1}ª Aula (${slotTime})`,
            isPresent,
            status: slotStatus,
            attendance_id: slotAtt?.id || null,
          };
        });

        const presentSlotsCount = slots.filter((s) => s.isPresent).length;
        const totalSlots = slots.length;
        const isAllPresent = presentSlotsCount === totalSlots;
        const isParcial = presentSlotsCount > 0 && presentSlotsCount < totalSlots;
        const overallStatus = isAllPresent ? 'PRESENTE' : isParcial ? 'PRESENCA_PARCIAL' : 'FALTA';

        const slotsMap: Record<string, boolean> = {};
        slots.forEach((s) => {
          slotsMap[s.slot_time] = s.isPresent;
        });

        return {
          id: student.id,
          attendance_id: studentAttendances[0]?.id || null,
          name: student.name,
          ra: student.ra,
          status: overallStatus,
          presentSlotsCount,
          totalSlots,
          slots,
          slotsMap,
          has_device: !!deviceAttendance,
          device_id: deviceAttendance?.device_id || null,
          student_semester: student.student_semester,
          courses: parseCourses(student.courses),
        };
      });

      // Ordenar alfabeticamente por nome
      studentsList.sort((a, b) => a.name.localeCompare(b.name));

      return res.json(studentsList);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar presenças da turma' });
    }
  }

  async changeRoomTemporarily(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { roomId, date } = req.body; // date in YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    try {
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: { enrollments: true }
      });
      if (!classData) return res.status(404).json({ error: 'Turma não encontrada' });

      if (!roomId) {
        // Restaurar sala padrão deletando a entrada temporária
        await prisma.temporaryClassLocation.deleteMany({
          where: { class_id: classId, date: String(date) }
        });

        // Notificar alunos sobre o retorno à sala padrão
        for (const enrollment of classData.enrollments) {
          await prisma.notification.create({
            data: {
              user_id: enrollment.student_id,
              title: `Troca de Sala: ${classData.subject}`,
              body: `Atenção: A aula de hoje da matéria ${classData.subject} retornou para a sala padrão ${classData.room_name}.`
            }
          });
        }

        return res.json({ message: 'Sala padrão restaurada com sucesso!' });
      }
      
      const roomData = await prisma.room.findUnique({ where: { id: roomId } });
      if (!roomData) return res.status(404).json({ error: 'Sala não encontrada' });

      // Verificação dupla de conflito
      const classesAtSameTime = await prisma.class.findMany({
        where: { schedule_time: classData.schedule_time, active: true },
        select: { room_name: true, id: true }
      });

      const temporaryLocsAtDate = await prisma.temporaryClassLocation.findMany({
        where: { date: String(date) },
        include: { class: true }
      });

      const busyTemporaryLocs = temporaryLocsAtDate.filter(loc => loc.class.schedule_time === classData.schedule_time);

      const isStandardOccupied = classesAtSameTime.some(c => {
        if (c.room_name === roomData.name && c.id !== classId) {
          const classHasTemporaryLocation = temporaryLocsAtDate.some(t => t.class_id === c.id);
          return !classHasTemporaryLocation; 
        }
        return false;
      });

      const isTemporarilyOccupied = busyTemporaryLocs.some(loc => loc.room_id === roomData.id && loc.class_id !== classId);

      if (isStandardOccupied || isTemporarilyOccupied) {
        return res.status(400).json({ error: 'Esta sala acabou de ser ocupada por outra turma neste horário.' });
      }

      // Salva ou atualiza a troca
      const tempLoc = await prisma.temporaryClassLocation.upsert({
        where: { class_id_date: { class_id: classId, date: String(date) } },
        update: {
          room_id: roomData.id,
          room_name: roomData.name,
          latitude: roomData.latitude,
          longitude: roomData.longitude
        },
        create: {
          class_id: classId,
          date: String(date),
          room_id: roomData.id,
          room_name: roomData.name,
          latitude: roomData.latitude,
          longitude: roomData.longitude
        }
      });

      // Notificar alunos sobre a alteração de sala
      const studentIds = classData.enrollments.map((e) => e.student_id);
      for (const enrollment of classData.enrollments) {
        await prisma.notification.create({
          data: {
            user_id: enrollment.student_id,
            title: `Troca de Sala: ${classData.subject}`,
            body: `Atenção: A sala da aula de hoje da matéria ${classData.subject} foi alterada temporariamente para ${roomData.name}.`
          }
        });
      }

      // Enviar notificação push aos celulares dos alunos
      sendPushNotification(studentIds, {
        title: `Troca de Sala: ${classData.subject}`,
        body: `Atenção: A aula de hoje de ${classData.subject} foi alterada para ${roomData.name}.`,
        data: { type: 'TROCA_SALA', classId: classData.id },
      });

      return res.json({ message: 'Sala alterada com sucesso!', tempLoc });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alterar sala' });
    }
  }

  // Obter todos os alunos matriculados na turma
  async getEnrolledStudents(req: AuthRequest, res: Response) {
    const classId = req.params.id;

    try {
      const dateQuery = req.query.date as string | undefined;
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { course_name: true, schedule_time: true, week_days: true }
      });

      const classSlots = resolveClassSlots(classInfo?.schedule_time, classInfo?.week_days, dateQuery || new Date());

      const enrollments = await prisma.enrollment.findMany({
        where: { class_id: classId },
        include: {
          student: {
            include: { userCourses: true }
          }
        }
      });

      const students = enrollments.map(e => {
        const matchingCourse = e.student.userCourses?.find(uc => uc.course_name === classInfo?.course_name);
        const specificSemester = matchingCourse?.semester || e.student.student_semester || 'Não informado';

        return {
          id: e.student.id,
          name: e.student.name,
          ra: e.student.ra || 'N/A',
          courses: parseCourses(e.student.courses),
          student_semester: specificSemester,
          userCourses: e.student.userCourses,
          active: e.student.active,
          classSlots: classSlots
        };
      });

      // Ordenar por nome
      students.sort((a, b) => a.name.localeCompare(b.name));

      return res.json(students);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar alunos matriculados' });
    }
  }

  // Registrar chamada manual (EAD)
  async registerManualAttendance(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { attendances, date } = req.body; // array de { studentId, slots?: Record<string, boolean>, isPresent?: boolean } e opcional date "YYYY-MM-DD"

    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ error: 'Dados de chamada inválidos' });
    }

    let targetDate = new Date();
    if (date) {
      const parts = String(date).split('-').map(Number);
      if (parts.length === 3) {
        targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        targetDate = new Date(date);
      }
    }
    targetDate.setHours(0, 0, 0, 0);

    try {
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { subject: true, schedule_time: true, week_days: true }
      });

      if (!classInfo) {
        return res.status(404).json({ error: 'Turma não encontrada' });
      }

      // Determinar os slots de aula para a data específica (respeitando 2 ou 4 horários do dia)
      const classSlots = resolveClassSlots(classInfo.schedule_time, classInfo.week_days, targetDate);

      const formattedDate = targetDate.toLocaleDateString('pt-BR');

      // Registrar ou atualizar as presenças de cada aluno na data especificada para todos os 4 slots
      for (const record of attendances) {
        const studentId = record.studentId || record.id;
        if (!studentId) continue;

        // Limpar registros manuais antigos com slot 'MANUAL' ou nulo para evitar duplicidade ou divergência
        await prisma.attendance.deleteMany({
          where: {
            student_id: studentId,
            class_id: classId,
            date: targetDate,
            OR: [
              { slot_time: 'MANUAL' },
              { slot_time: null }
            ]
          }
        });

        let anyPresent = false;

        for (const slot of classSlots) {
          let isSlotPresent = false;

          if (record.slots && typeof record.slots === 'object') {
            if (Array.isArray(record.slots)) {
              const found = record.slots.find((s: any) => s.slot_time === slot);
              isSlotPresent = found ? !!found.isPresent : !!record.isPresent;
            } else if (typeof record.slots[slot] === 'boolean') {
              isSlotPresent = record.slots[slot];
            } else {
              isSlotPresent = !!record.isPresent;
            }
          } else if (typeof record.isPresent === 'boolean') {
            isSlotPresent = record.isPresent;
          }

          if (isSlotPresent) {
            anyPresent = true;
          }

          await prisma.attendance.upsert({
            where: {
              student_id_class_id_date_slot_time: {
                student_id: studentId,
                class_id: classId,
                date: targetDate,
                slot_time: slot
              }
            },
            update: {
              status: isSlotPresent ? 'PRESENTE' : 'FALTA',
              manual_attendance: true
            },
            create: {
              student_id: studentId,
              class_id: classId,
              date: targetDate,
              slot_time: slot,
              check_in_time: new Date(),
              status: isSlotPresent ? 'PRESENTE' : 'FALTA',
              manual_attendance: true
            }
          });
        }

        if (anyPresent) {
          const alreadyNotified = await prisma.notification.findFirst({
            where: {
              user_id: studentId,
              title: `Presença Confirmada: ${classInfo.subject}`,
              created_at: { gte: targetDate }
            }
          });

          if (!alreadyNotified) {
            await prisma.notification.create({
              data: {
                user_id: studentId,
                title: `Presença Confirmada: ${classInfo.subject}`,
                body: `Sua presença na aula de ${classInfo.subject} em ${formattedDate} foi registrada pelo professor.`
              }
            });
          }
        }
      }

      return res.json({ message: 'Chamada manual registrada com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar a chamada manual' });
    }
  }

  async resetDeviceBinding(req: AuthRequest, res: Response) {
    const userRole = req.user?.role;

    if (userRole !== 'PROFESSOR' && userRole !== 'COORDENADOR') {
      return res.status(403).json({ error: 'Acesso negado. Apenas professores ou coordenadores podem realizar esta ação.' });
    }

    const { attendanceId, studentId, classId, date } = req.body;

    if (!attendanceId && (!studentId || !classId)) {
      return res.status(400).json({ error: 'Informe o attendanceId ou (studentId e classId)' });
    }

    try {
      let attendance;

      if (attendanceId) {
        attendance = await prisma.attendance.findUnique({
          where: { id: attendanceId }
        });
      } else {
        let targetDate = new Date();
        if (date) {
          const parts = String(date).split('-').map(Number);
          if (parts.length === 3) {
            targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
          } else {
            targetDate = new Date(date);
          }
        }
        targetDate.setHours(0, 0, 0, 0);

        attendance = await prisma.attendance.findFirst({
          where: {
            student_id: studentId,
            class_id: classId,
            date: targetDate
          }
        });
      }

      if (!attendance) {
        return res.status(404).json({ error: 'Registro de presença não encontrado.' });
      }

      const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { device_id: null }
      });

      return res.json({
        message: 'Vínculo de dispositivo liberado com sucesso!',
        attendance: updated
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao resetar vínculo de dispositivo.' });
    }
  }

  async getDatasComChamada(req: AuthRequest, res: Response) {
    const classId = req.params.id;

    try {
      const presencas = await prisma.attendance.findMany({
        where: {
          class_id: classId,
        },
        select: {
          date: true
        },
        distinct: ['date']
      });

      const dates = presencas.map(p => {
        const d = p.date instanceof Date ? p.date : new Date(p.date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      return res.json(dates);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar datas com chamada' });
    }
  }
}
