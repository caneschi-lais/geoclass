import { isAcademicInstructionalDay } from '../services/CalendarService';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import {
  getBrazilMidnightDate,
  getBrazilDayOfWeek,
  getBrazilDateString,
  getBrazilParts,
  evaluateSlotTime,
  createBrazilDate,
} from '../utils/dateUtils';
import prisma from '../prisma';

export function isClassScheduledToday(weekDays?: string | null, date: Date = new Date()): boolean {
  if (!weekDays || weekDays.trim() === '') return true;
  const dayName = getBrazilDayOfWeek(date);

  const normalizedWeekDays = weekDays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const days = normalizedWeekDays.split(',').map((d) => d.trim());
  return days.some((d) => d.includes(dayName) || dayName.includes(d));
}

// Cache em memória de slots de chamada já finalizados hoje para evitar re-consultas redundantes a cada minuto
let lastCacheDateStr: string = '';
const finalizedSlotsToday = new Set<string>();

export function clearFinalizedSlotsCache() {
  finalizedSlotsToday.clear();
}

/**
 * Processa o fechamento de tolerância (15 minutos) para todos os slots de aulas de hoje.
 * Se o dia for letivo e o aluno estiver matriculado, o curso/disciplina não estiver concluído e
 * passarem os 15 minutos sem registro de presença (PRESENTE),
 * insere automaticamente um registro de FALTA no banco de dados e notifica o aluno.
 */
export async function processExpiredAttendanceSlots(currentDate: Date = new Date()): Promise<void> {
  const todayDate = getBrazilMidnightDate(currentDate);
  const currentDayName = getBrazilDayOfWeek(currentDate);
  const brazilParts = getBrazilParts(currentDate);
  const todayStr = getBrazilDateString(currentDate);

  // Se virou o dia, reseta o cache de slots finalizados
  if (todayStr !== lastCacheDateStr) {
    lastCacheDateStr = todayStr;
    finalizedSlotsToday.clear();
  }

  // Não executa se estiver fora do horário de aulas (07h às 23h30) ou domingo
  const dayOfWeek = currentDate.getDay();
  if (dayOfWeek === 0 || brazilParts.hour < 7 || (brazilParts.hour >= 23 && brazilParts.minute > 30)) {
    return;
  }

  try {
    // 0. Validar se hoje é um dia letivo no Calendário Acadêmico
    const calendarCheck = await isAcademicInstructionalDay(currentDate);
    if (!calendarCheck.isInstructional) {
      return;
    }

    const activeClasses = await prisma.class.findMany({
      where: { active: true },
      include: {
        professor: true,
        enrollments: {
          where: {
            is_completed: false,
            student: {
              active: true,
            },
          },
          include: {
            student: {
              include: {
                userCourses: true,
              },
            },
          },
        },
      },
    });

    for (const cls of activeClasses) {
      // 1. Verificar se a aula está agendada para o dia corrente
      if (cls.week_days) {
        const normalizedWeekDays = cls.week_days
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const days = normalizedWeekDays.split(',').map((d) => d.trim());
        const isScheduledToday = days.some((d) => d.includes(currentDayName) || currentDayName.includes(d));
        if (!isScheduledToday) continue;
      }

      // 2. Processar cada slot relativo ao dia atual (ex: 19:00, 19:50 na terça)
      const slots = getScheduleSlotsForDay(cls.schedule_time, cls.week_days, currentDayName);

      for (let i = 0; i < slots.length; i++) {
        const slotStr = slots[i];
        const slotKey = `${cls.id}_${slotStr}`;

        // Se este slot já expirou e foi completamente finalizado hoje, pula sem consultar o banco
        if (finalizedSlotsToday.has(slotKey)) {
          continue;
        }

        const nextSlotStr = slots[i + 1] || null;
        const [schedHours, schedMinutes] = slotStr.split(':').map(Number);
        if (isNaN(schedHours) || isNaN(schedMinutes)) continue;

        const { isExpired, endMinutes } = evaluateSlotTime(slotStr, currentDate, nextSlotStr);

        // A tolerância já encerrou hoje no Horário de Brasília?
        if (isExpired) {
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const slotEndTime = createBrazilDate(
            brazilParts.year,
            brazilParts.month,
            brazilParts.day,
            endH,
            endM
          );

          // Buscar todos os registros de presença ou falta já existentes para este slot hoje (1 única query para a turma inteira)
          const existingAttendances = await prisma.attendance.findMany({
            where: {
              class_id: cls.id,
              date: todayDate,
              slot_time: slotStr,
            },
            select: { student_id: true },
          });
          const attendedStudentIds = new Set(existingAttendances.map((a) => a.student_id));

          for (const enrollment of cls.enrollments) {
            const student = enrollment.student;

            // Se o curso do aluno foi concluído, ignorar
            if (cls.course_id) {
              const userCourse = student.userCourses?.find((uc: any) => uc.course_id === cls.course_id);
              if (userCourse?.is_completed) continue;
            }

            // Se NÃO houver registro, insere FALTA no banco
            if (!attendedStudentIds.has(student.id)) {
              try {
                await prisma.attendance.create({
                  data: {
                    student_id: student.id,
                    class_id: cls.id,
                    date: todayDate,
                    slot_time: slotStr,
                    check_in_time: slotEndTime,
                    status: 'FALTA',
                    manual_attendance: false,
                  },
                });

                // Notificar o aluno sobre a falta
                const notifTitle = `Falta Registrada: ${cls.subject}`;
                const alreadyNotified = await prisma.notification.findFirst({
                  where: {
                    user_id: student.id,
                    title: notifTitle,
                    created_at: { gte: todayDate },
                  },
                });

                if (!alreadyNotified) {
                  await prisma.notification.create({
                    data: {
                      user_id: student.id,
                      title: notifTitle,
                      body: `O prazo de 15 minutos para a chamada das ${slotStr} em ${cls.subject} encerrou e sua ausência foi registrada no banco de dados.`,
                    },
                  });
                }
              } catch (err: any) {
                if (err.code !== 'P2002') {
                  console.error(`[ABSENCE] Erro ao registrar falta para aluno ${student.id}:`, err);
                }
              }
            }
          }

          // Slot expirado e processado para todos os alunos: salva no cache da memória para não consultar mais hoje
          finalizedSlotsToday.add(slotKey);
        }
      }
    }
  } catch (error) {
    console.error('[ABSENCE] Erro geral ao processar faltas de horários expirados:', error);
  }
}
