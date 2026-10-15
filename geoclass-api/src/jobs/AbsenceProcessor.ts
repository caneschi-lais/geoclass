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

  try {
    // 0. Validar se hoje é um dia letivo no Calendário Acadêmico
    const calendarCheck = await isAcademicInstructionalDay(currentDate);
    if (!calendarCheck.isInstructional) {
      console.log(`[ABSENCE] Hoje (${todayStr}) não é dia letivo: ${calendarCheck.reason}. Faltas suspensas.`);
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

      // 2. Se a aula foi marcada manualmente como EAD pelo professor hoje, ignorar
      const manualToday = await prisma.attendance.findFirst({
        where: {
          class_id: cls.id,
          date: todayDate,
          manual_attendance: true,
        },
      });
      if (manualToday) continue;

      // 2.1. Se a aula possui cancelamento aprovado para hoje (falta do professor ou institucional), ignorar
      let cancellationToday = null;
      try {
        if ((prisma as any).classCancellation) {
          cancellationToday = await (prisma as any).classCancellation.findFirst({
            where: {
              status: 'APROVADO',
              date: todayDate,
              OR: [
                { class_id: cls.id },
                { scope: 'INSTITUICAO' },
                ...(cls.course_id ? [{ scope: 'CURSO', course_id: cls.course_id }] : []),
              ],
            },
          });
        }
      } catch (err) {
        // Modelo ClassCancellation pode ainda não estar gerado
      }

      if (cancellationToday) continue;

      // 3. Processar cada slot relativo ao dia atual (ex: 19:00, 19:50 na terça e 20:50, 21:40 na quarta)
      const slots = getScheduleSlotsForDay(cls.schedule_time, cls.week_days, currentDayName);

      // Auto-remediação: se existirem faltas automáticas gravadas prematuramente para slots que ainda NÃO expiraram hoje, remove
      for (const slotStr of slots) {
        const { isExpired } = evaluateSlotTime(slotStr, currentDate);
        if (!isExpired) {
          try {
            await prisma.attendance.deleteMany({
              where: {
                class_id: cls.id,
                date: todayDate,
                slot_time: slotStr,
                status: 'FALTA',
                manual_attendance: false,
              },
            });
          } catch (cleanErr) {
            // Ignora se não houver registros
          }
        }
      }

      for (const slotStr of slots) {
        const [schedHours, schedMinutes] = slotStr.split(':').map(Number);
        if (isNaN(schedHours) || isNaN(schedMinutes)) continue;

        const { isExpired } = evaluateSlotTime(slotStr, currentDate);

        // A tolerância de 15 minutos já passou hoje no Horário de Brasília?
        if (isExpired) {
          const slotEndTime = createBrazilDate(
            brazilParts.year,
            brazilParts.month,
            brazilParts.day,
            schedHours,
            schedMinutes + 15
          );

          for (const enrollment of cls.enrollments) {
            const student = enrollment.student;

            // Se o curso do aluno foi concluído, ignorar
            if (cls.course_id) {
              const userCourse = student.userCourses?.find((uc: any) => uc.course_id === cls.course_id);
              if (userCourse?.is_completed) continue;
            }

            // Verificar se já existe registro de presença ou falta para este slot hoje
            const existingAttendance = await prisma.attendance.findFirst({
              where: {
                student_id: student.id,
                class_id: cls.id,
                date: todayDate,
                slot_time: slotStr,
              },
            });

            // Se NÃO houver registro, insere FALTA no banco
            if (!existingAttendance) {
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
                    is_remote: false,
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
        }
      }
    }
  } catch (error) {
    console.error('[ABSENCE] Erro geral ao processar faltas de horários expirados:', error);
  }
}
