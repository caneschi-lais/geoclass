import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { isAcademicInstructionalDay } from '../services/CalendarService';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import {
  getBrazilMidnightDate,
  getBrazilDayOfWeek,
  getBrazilDateString,
  getBrazilParts,
  createBrazilDate,
} from '../utils/dateUtils';
import crypto from 'crypto';
import prisma from '../prisma';
const OFFLINE_SECRET = process.env.OFFLINE_SECRET || 'geoclass_offline_secret_key_2026';

// Função utilitária: Fórmula de Haversine para calcular distância em metros
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Raio da terra em metros
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distância em metros
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export class AttendanceController {
  async registrarPresenca(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;
    const { classId, lat, lon, deviceId, timestamp, signature, accuracy } = req.body;
    const gpsAccuracy = accuracy !== undefined && accuracy !== null ? Number(accuracy) : 0;

    if (!studentId || !classId || !lat || !lon) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
      // Determinar o momento do registro de presença no Horário de Brasília
      const checkInTime = timestamp ? new Date(timestamp) : new Date();
      const checkInDate = getBrazilMidnightDate(checkInTime);
      const currentDayName = getBrazilDayOfWeek(checkInTime);
      const brazilParts = getBrazilParts(checkInTime);

      // 0. Validação de Calendário Acadêmico (Feriados, Recessos, etc.)
      const calendarCheck = await isAcademicInstructionalDay(checkInTime);
      if (!calendarCheck.isInstructional) {
        return res.status(403).json({
          error: `Hoje não é um dia letivo: ${calendarCheck.reason}. Registros de presença suspensos.`,
        });
      }

      // 1. Buscar informações da sala de aula
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: { room: true, course: true }
      });

      if (!classData) {
        return res.status(404).json({ error: 'Aula não encontrada' });
      }

      // 1.2 Validação de Assinatura Digital para Sincronização Offline
      if (signature && timestamp) {
        const payloadString = `${classId}${lat}${lon}${timestamp}${deviceId || ''}${OFFLINE_SECRET}`;
        const expectedSignature = crypto.createHash('sha256').update(payloadString).digest('hex');
        
        if (signature !== expectedSignature) {
          return res.status(403).json({ error: 'Assinatura digital inválida. Os dados de localização ou horário foram adulterados.' });
        }
      }

      // 1.5 Validação de Janela de Horário Estrita por Slots (Horário de Brasília)
      const slots = getScheduleSlotsForDay(classData.schedule_time, classData.week_days, currentDayName);
      let activeSlot: string | null = null;
      let expiredSlot: string | null = null;
      let expiredEndTime: Date | null = null;
      let nextUpcomingSlot: string | null = null;

      for (const slotStr of slots) {
        const [schedHours, schedMinutes] = slotStr.split(':').map(Number);
        if (isNaN(schedHours) || isNaN(schedMinutes)) continue;

        const startTime = createBrazilDate(
          brazilParts.year,
          brazilParts.month,
          brazilParts.day,
          schedHours,
          schedMinutes
        );
        const endTime = createBrazilDate(
          brazilParts.year,
          brazilParts.month,
          brazilParts.day,
          schedHours,
          schedMinutes + 15 // Tolerância estrita de 15 minutos
        );

        if (checkInTime >= startTime && checkInTime <= endTime) {
          activeSlot = slotStr;
          break;
        } else if (checkInTime > endTime) {
          expiredSlot = slotStr;
          expiredEndTime = endTime;
        } else if (checkInTime < startTime && !nextUpcomingSlot) {
          nextUpcomingSlot = slotStr;
        }
      }

      if (!activeSlot) {
        // Se a chamada da aula ainda não abriu hoje
        if (nextUpcomingSlot && !expiredSlot) {
          return res.status(403).json({
            error: `A chamada ainda não abriu. A próxima chamada abre às ${nextUpcomingSlot} e encerra em 15 minutos (tolerância). Horários da disciplina: ${slots.join(', ')}.`
          });
        }

        // Se já passou do horário de tolerância de 15 minutos, registra a ausência (falta) no banco
        if (expiredSlot) {
          const existingExpiredAttendance = await prisma.attendance.findFirst({
            where: {
              student_id: studentId,
              class_id: classId,
              date: checkInDate,
              slot_time: expiredSlot,
            },
          });

          if (!existingExpiredAttendance) {
            await prisma.attendance.create({
              data: {
                student_id: studentId,
                class_id: classId,
                date: checkInDate,
                slot_time: expiredSlot,
                check_in_time: expiredEndTime || checkInTime,
                status: 'FALTA',
                manual_attendance: false,
                is_remote: false,
              },
            });

            await prisma.notification.create({
              data: {
                user_id: studentId,
                title: `Falta Registrada: ${classData.subject}`,
                body: `O limite de tolerância de 15 minutos para a chamada das ${expiredSlot} encerrou e sua ausência foi registrada.`,
              },
            });
          }

          if (nextUpcomingSlot) {
            return res.status(403).json({
              error: `A tolerância de 15 minutos para o horário das ${expiredSlot} expirou. A próxima chamada abre às ${nextUpcomingSlot}.`
            });
          }

          return res.status(403).json({ 
            error: `A tolerância de 15 minutos para o horário das ${expiredSlot} expirou. Sua ausência (falta) foi registrada no sistema.` 
          });
        }

        return res.status(403).json({ 
          error: `Não há chamada aberta neste momento. Horários da disciplina: ${classData.schedule_time}. Cada chamada fica aberta por 15min a partir do horário.` 
        });
      }

      // Verificar se a presença para este horário específico (slot) já foi registrada hoje
      const existingSlotAttendance = await prisma.attendance.findFirst({
        where: {
          student_id: studentId,
          class_id: classId,
          date: checkInDate,
          slot_time: activeSlot
        }
      });

      if (existingSlotAttendance) {
        if (existingSlotAttendance.status === 'PRESENTE' || existingSlotAttendance.status === 'ATRASADO') {
          return res.status(400).json({ error: `Você já registrou presença para o horário das ${activeSlot} hoje.` });
        }
      }

      // 2. Verificar se o aluno está matriculado nesta turma
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          student_id_class_id: {
            student_id: studentId,
            class_id: classId
          }
        }
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'Aluno não matriculado nesta turma' });
      }

      if (enrollment.is_completed) {
        return res.status(403).json({ 
          error: `Você já concluiu a matéria de ${classData.subject}. Não é possível registrar novas presenças para esta matéria (Modo Leitura).` 
        });
      }

      // 2.1 Verificar se o aluno já concluiu o curso desta disciplina (Curso Concluído = Somente Leitura)
      if (classData.course_id) {
        const userCourse = await prisma.userCourse.findUnique({
          where: {
            user_id_course_id: {
              user_id: studentId,
              course_id: classData.course_id
            }
          },
          include: { course: true }
        });

        if (userCourse?.is_completed) {
          const courseName = userCourse.course?.name || classData.course?.name || 'seu curso';
          return res.status(403).json({ 
            error: `Você já concluiu o curso de ${courseName}. Não é possível registrar novas presenças para disciplinas deste curso (Modo Leitura/Histórico).` 
          });
        }
      }

      // 2.5 Verificar se a aula já foi registrada como EAD/Manual hoje pelo professor
      const manualAttendanceExists = await prisma.attendance.findFirst({
        where: {
          class_id: classId,
          date: checkInDate,
          manual_attendance: true
        }
      });

      if (manualAttendanceExists) {
        return res.status(403).json({ error: 'A chamada desta aula já foi controlada manualmente pelo professor hoje (Aula EAD).' });
      }

      // 3. Validação de Localização (Haversine)
      // Checa se há uma troca de sala para a data informada
      const tempRoom = await prisma.temporaryClassLocation.findUnique({
        where: { class_id_date: { class_id: classId, date: checkInDate } },
        include: { room: true }
      });

      const targetLatitude = tempRoom ? tempRoom.room.latitude : classData.room.latitude;
      const targetLongitude = tempRoom ? tempRoom.room.longitude : classData.room.longitude;
      const targetRadius = classData.radius_meters;

      const distance = getDistanceFromLatLonInMeters(lat, lon, targetLatitude, targetLongitude);
      
      if (distance - gpsAccuracy > targetRadius) {
        return res.status(400).json({ 
          error: `Você está fora da área permitida. Distância atual (ajustada): ${Math.round(distance - gpsAccuracy)}m. Máximo: ${targetRadius}m.` 
        });
      }

      // 4. Checagem de Fraude de Dispositivo (Opcional)
      if (deviceId) {
        const deviceUsedByOther = await prisma.attendance.findFirst({
          where: {
            device_id: deviceId,
            date: checkInDate,
            student_id: { not: studentId }
          }
        });

        if (deviceUsedByOther) {
          return res.status(403).json({ error: 'Este dispositivo já registrou presença para outro aluno hoje. Tentativa de fraude detectada.' });
        }
      }

      // 5. Registrar no Banco de Dados (cria novo ou atualiza falta automática gerada prematuramente)
      let attendance;
      if (existingSlotAttendance) {
        attendance = await prisma.attendance.update({
          where: { id: existingSlotAttendance.id },
          data: {
            check_in_time: checkInTime,
            device_id: deviceId,
            status: 'PRESENTE',
            student_latitude: lat,
            student_longitude: lon,
            manual_attendance: false,
            is_remote: false,
          }
        });
      } else {
        attendance = await prisma.attendance.create({
          data: {
            student_id: studentId,
            class_id: classId,
            date: checkInDate,
            slot_time: activeSlot,
            check_in_time: checkInTime,
            device_id: deviceId,
            status: 'PRESENTE',
            student_latitude: lat,
            student_longitude: lon
          }
        });
      }

      // Notificar o aluno sobre a confirmação da presença
      const formattedDate = checkInDate.toLocaleDateString('pt-BR');
      await prisma.notification.create({
        data: {
          user_id: studentId,
          title: `Presença Confirmada: ${classData.subject}`,
          body: `Sua presença na aula de ${classData.subject} em ${formattedDate} foi registrada com sucesso!`
        }
      });

      // Checar se a frequência está em zona de risco (< 75%) e notificar o aluno
      const faltasCount = await prisma.attendance.count({
        where: { student_id: studentId, class_id: classId, status: 'FALTA' }
      });
      const totalClasses = classData.total_classes || 40;
      const absencePercentage = totalClasses === 0 ? 0 : Math.round((faltasCount / totalClasses) * 100);
      const attendancePercentage = Math.max(0, 100 - absencePercentage);

      if (attendancePercentage < 75) {
        const riskTitle = `Alerta de Risco de Frequência: ${classData.subject}`;
        const alreadyAlertedToday = await prisma.notification.findFirst({
          where: {
            user_id: studentId,
            title: riskTitle,
            created_at: { gte: checkInDate }
          }
        });

        if (!alreadyAlertedToday) {
          await prisma.notification.create({
            data: {
              user_id: studentId,
              title: riskTitle,
              body: `Atenção: Você atingiu o limite crítico de faltas em ${classData.subject} (${attendancePercentage}% de presença). Mantenha sua frequência acima de 75% para não reprovar por falta.`
            }
          });
        }
      }

      return res.status(201).json({ message: 'Presença registrada com sucesso!', attendance });
    } catch (error: any) {
      console.error(error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Você já registrou presença nesta aula hoje.' });
      }

      return res.status(500).json({ error: 'Erro interno ao registrar presença.' });
    }
  }
}
