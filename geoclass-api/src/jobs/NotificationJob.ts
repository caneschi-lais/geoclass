import { processExpiredAttendanceSlots, isClassScheduledToday } from './AbsenceProcessor';
import { isAcademicInstructionalDay } from '../services/CalendarService';
import { getScheduleSlotsForDay } from '../utils/scheduleHelper';
import {
  getBrazilMidnightDate,
  getBrazilDayOfWeek,
  getBrazilParts,
} from '../utils/dateUtils';
import { sendPushNotification } from '../services/pushNotificationService';
import prisma from '../prisma';

// Auxiliar para obter horário de término/fechamento do slot (até 15min ou início da próxima aula)
function getSlotEndTimeStr(slotStr: string, nextSlotStr?: string | null): string {
  const [h, m] = slotStr.split(':').map(Number);
  const startMin = h * 60 + m;
  let endMin = startMin + 15;
  if (nextSlotStr) {
    const [nh, nm] = nextSlotStr.split(':').map(Number);
    const nextMin = nh * 60 + nm;
    if (nextMin > startMin) {
      endMin = Math.min(endMin, nextMin);
    }
  }
  const totalMin = endMin % (24 * 60);
  const rh = Math.floor(totalMin / 60);
  const rm = totalMin % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

// Auxiliar para obter horário de alerta prévio de tolerância (5 minutos antes do término)
function getSlotExpiringTimeStr(slotStr: string, nextSlotStr?: string | null): string {
  const [h, m] = slotStr.split(':').map(Number);
  const startMin = h * 60 + m;
  let endMin = startMin + 15;
  if (nextSlotStr) {
    const [nh, nm] = nextSlotStr.split(':').map(Number);
    const nextMin = nh * 60 + nm;
    if (nextMin > startMin) {
      endMin = Math.min(endMin, nextMin);
    }
  }
  const expMin = (endMin - 5 + 24 * 60) % (24 * 60);
  const rh = Math.floor(expMin / 60);
  const rm = expMin % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

export async function notificationJob() {
  const now = new Date();
  const brazilParts = getBrazilParts(now);

  // Não executa fora do horário escolar (07h às 23h15) nem aos domingos
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 0 || brazilParts.hour < 7 || (brazilParts.hour >= 23 && brazilParts.minute > 15)) {
    return;
  }

  const todayDate = getBrazilMidnightDate(now);
  const currentHours = String(brazilParts.hour).padStart(2, '0');
  const currentMinutes = String(brazilParts.minute).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  try {
    // 0. Processar fechamento de faltas para horários cuja tolerância de 15 minutos já expirou hoje
    await processExpiredAttendanceSlots(now);

    // 0.1 Se hoje não for dia letivo, não dispara notificações de início ou fechamento de aula
    const calendarCheck = await isAcademicInstructionalDay(now);
    if (!calendarCheck.isInstructional) {
      return;
    }

    // Buscar todas as turmas ativas
    const activeClasses = await prisma.class.findMany({
      where: { active: true },
      include: {
        professor: true,
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    for (const cls of activeClasses) {
      // Verificar se a aula está prevista para hoje
      if (!isClassScheduledToday(cls.week_days, now)) {
        continue;
      }

      // Verificar se a aula possui cancelamento aprovado para hoje
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
        // Modelo ClassCancellation pode ainda não estar gerado pelo prisma generate
      }

      if (cancellationToday) {
        continue;
      }

      const currentDayName = getBrazilDayOfWeek(now);
      const slots = getScheduleSlotsForDay(cls.schedule_time, cls.week_days, currentDayName);

      // 1. Aluno (Lembrete de Início de Aula) e 2. Professor (Fechamento de Chamada)
      for (let i = 0; i < slots.length; i++) {
        const slotStr = slots[i];
        const nextSlotStr = slots[i + 1] || null;

        if (slotStr === currentTimeStr) {
          console.log(`[NOTIFICATION JOB] Enviando lembretes de início de aula para: ${cls.subject} (${slotStr})`);
          for (const enrollment of cls.enrollments) {
            const student = enrollment.student;

            const title = `Lembrete de Aula: ${cls.subject}`;
            const alreadyNotified = await prisma.notification.findFirst({
              where: {
                user_id: student.id,
                title,
                created_at: {
                  gte: todayDate,
                },
              },
            });

            if (!alreadyNotified) {
              await prisma.notification.create({
                data: {
                  user_id: student.id,
                  title,
                  body: `Sua aula de ${cls.subject} começou às ${slotStr}. Registre sua presença nos próximos 15 minutos para não receber falta!`,
                },
              });

              sendPushNotification(student.id, {
                title,
                body: `Sua aula de ${cls.subject} começou às ${slotStr}. Registre sua presença nos próximos 15 minutos!`,
                data: { type: 'LEMBRETE_AULA', classId: cls.id },
              });
            }
          }
        }

        // 1.1 Aluno (Tolerância Expirando - 5 minutos antes do fim da tolerância)
        const expiringTriggerTime = getSlotExpiringTimeStr(slotStr, nextSlotStr);
        if (expiringTriggerTime === currentTimeStr) {
          console.log(`[NOTIFICATION JOB] Enviando alerta de tolerância expirando (5 min) para: ${cls.subject} (${slotStr})`);

          for (const enrollment of cls.enrollments) {
            const student = enrollment.student;

            // Verificar se o aluno já registrou presença neste slot hoje
            const hasAttendance = await prisma.attendance.findFirst({
              where: {
                student_id: student.id,
                class_id: cls.id,
                date: todayDate,
                slot_time: slotStr,
                status: { in: ['PRESENTE', 'ATRASADO'] },
              },
            });

            if (!hasAttendance) {
              const expTitle = `Tolerância Expirando: ${cls.subject}`;
              const alreadyNotifiedExp = await prisma.notification.findFirst({
                where: {
                  user_id: student.id,
                  title: expTitle,
                  created_at: {
                    gte: todayDate,
                  },
                },
              });

              if (!alreadyNotifiedExp) {
                const expBody = `Restam apenas 5 minutos para registrar presença na aula das ${slotStr} de ${cls.subject}! Abra o aplicativo para validar seu check-in.`;
                await prisma.notification.create({
                  data: {
                    user_id: student.id,
                    title: expTitle,
                    body: expBody,
                  },
                });

                sendPushNotification(student.id, {
                  title: expTitle,
                  body: expBody,
                  data: { type: 'TOLERANCIA_EXPIRANDO', classId: cls.id, slot: slotStr },
                });
              }
            }
          }
        }

        // 2. Professor (Fechamento de Chamada - no fim da tolerância do slot)
        const professorTriggerTime = getSlotEndTimeStr(slotStr, nextSlotStr);
        if (professorTriggerTime === currentTimeStr) {
          console.log(`[NOTIFICATION JOB] Enviando relatório de chamada para professor de: ${cls.subject} (${slotStr})`);

          const checkedInCount = await prisma.attendance.count({
            where: {
              class_id: cls.id,
              date: todayDate,
              slot_time: slotStr,
              status: { in: ['PRESENTE', 'ATRASADO'] },
            },
          });

          const absentCount = await prisma.attendance.count({
            where: {
              class_id: cls.id,
              date: todayDate,
              slot_time: slotStr,
              status: 'FALTA',
            },
          });

          const totalStudents = cls.enrollments.length;
          const title = `Fechamento de Chamada: ${cls.subject} (${slotStr})`;

          const alreadyNotified = await prisma.notification.findFirst({
            where: {
              user_id: cls.professor_id,
              title,
              created_at: {
                gte: todayDate,
              },
            },
          });

          if (!alreadyNotified) {
            const reportBody = `A tolerância de 15 minutos para o horário das ${slotStr} de ${cls.subject} encerrou. Resultado: ${checkedInCount} presentes, ${absentCount} faltas registradas (${totalStudents} matriculados).`;
            await prisma.notification.create({
              data: {
                user_id: cls.professor_id,
                title,
                body: reportBody,
              },
            });

            sendPushNotification(cls.professor_id, {
              title,
              body: reportBody,
              data: { type: 'FECHAMENTO_CHAMADA', classId: cls.id, slot: slotStr },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION JOB] Erro ao executar job de notificações:', error);
  }
}

/**
 * Rotina diária de Risco de Evasão e Absenteísmo.
 * Executada apenas em horários específicos (ex: 12:30 e 22:30) para evitar milhões
 * de consultas desnecessárias no banco de dados Supabase ao longo do dia.
 */
export async function evasionRiskJob() {
  console.log('[EVASION JOB] Iniciando verificação diária de Risco de Evasão e Absenteísmo...');

  try {
    const activeClasses = await prisma.class.findMany({
      where: { active: true },
      include: {
        professor: true,
        enrollments: {
          include: {
            student: true,
          },
        },
      },
    });

    // Obter todos os coordenadores com seus cursos vinculados
    const coordinators = await prisma.user.findMany({
      where: { role: 'COORDENADOR', active: true },
      include: {
        userCourses: {
          select: { course_id: true },
        },
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const cls of activeClasses) {
      // Obter quantidade de aulas ministradas (datas distintas com presença registrada para essa turma)
      const uniqueDates = await prisma.attendance.findMany({
        where: { class_id: cls.id },
        select: { date: true },
        distinct: ['date'],
      });
      const totalClassesTaught = uniqueDates.length;

      // Só gera alertas se já houver pelo menos 4 aulas ministradas nesta matéria
      if (totalClassesTaught >= 4) {
        let classTotalAbsenceRate = 0;
        let studentsChecked = 0;

        for (const enrollment of cls.enrollments) {
          const student = enrollment.student;

          const presences = await prisma.attendance.count({
            where: {
              class_id: cls.id,
              student_id: student.id,
              status: { in: ['PRESENTE', 'ATRASADO'] },
            },
          });

          const absences = totalClassesTaught - presences;
          const absenceRate = Math.round((absences / totalClassesTaught) * 100);

          classTotalAbsenceRate += absenceRate;
          studentsChecked++;

          // A) Aluno (Alerta de Evasão por Matéria - >= 20%)
          if (absenceRate >= 20) {
            const studentTitle = `Alerta de Evasão: ${cls.subject}`;
            const studentAlreadyAlerted = await prisma.notification.findFirst({
              where: {
                user_id: student.id,
                title: studentTitle,
                created_at: {
                  gte: sevenDaysAgo,
                },
              },
            });

            if (!studentAlreadyAlerted) {
              const riskBody = `Seu índice de faltas em ${cls.subject} atingiu ${absenceRate}%. Mantenha sua frequência acima de 75% para não reprovar por faltas!`;
              await prisma.notification.create({
                data: {
                  user_id: student.id,
                  title: studentTitle,
                  body: riskBody,
                },
              });

              sendPushNotification(student.id, {
                title: studentTitle,
                body: riskBody,
                data: { type: 'RISCO_REPROVACAO', classId: cls.id },
              });
            }
          }

          // B) Coordenador (Risco de Evasão Individual do Aluno >= 25% na média geral)
          const studentEnrollments = await prisma.enrollment.findMany({
            where: { student_id: student.id },
            include: { class: true },
          });

          let studentTotalClassesTaught = 0;
          let studentTotalPresences = 0;

          for (const se of studentEnrollments) {
            const seDates = await prisma.attendance.findMany({
              where: { class_id: se.class_id },
              select: { date: true },
              distinct: ['date'],
            });
            const seTaught = seDates.length;

            if (seTaught >= 4) {
              const sePresences = await prisma.attendance.count({
                where: {
                  class_id: se.class_id,
                  student_id: student.id,
                  status: { in: ['PRESENTE', 'ATRASADO'] },
                },
              });
              studentTotalClassesTaught += seTaught;
              studentTotalPresences += sePresences;
            }
          }

          if (studentTotalClassesTaught > 0) {
            const studentTotalAbsences = studentTotalClassesTaught - studentTotalPresences;
            const studentAverageAbsenceRate = Math.round((studentTotalAbsences / studentTotalClassesTaught) * 100);

            if (studentAverageAbsenceRate > 25) {
              const coordTitle = `Risco de Evasão: ${student.name}`;

              // Identificar todos os cursos aos quais o aluno está vinculado
              const studentCourseIds = studentEnrollments
                .map((se) => se.class.course_id)
                .filter((id): id is number => id !== null);

              const studentDirectCourses = await prisma.userCourse.findMany({
                where: { user_id: student.id },
                select: { course_id: true },
              });
              for (const sdc of studentDirectCourses) {
                if (!studentCourseIds.includes(sdc.course_id)) {
                  studentCourseIds.push(sdc.course_id);
                }
              }

              // Filtrar coordenadores apenas dos cursos do aluno
              const targetCoords = coordinators.filter((coord) =>
                coord.userCourses.some((uc) => studentCourseIds.includes(uc.course_id))
              );

              for (const coord of targetCoords) {
                const coordAlreadyAlerted = await prisma.notification.findFirst({
                  where: {
                    user_id: coord.id,
                    title: coordTitle,
                    created_at: {
                      gte: sevenDaysAgo,
                    },
                  },
                });

                if (!coordAlreadyAlerted) {
                  await prisma.notification.create({
                    data: {
                      user_id: coord.id,
                      title: coordTitle,
                      body: `O aluno ${student.name} (RA: ${student.ra || 'N/A'}) apresenta uma taxa média de faltas de ${studentAverageAbsenceRate}% no semestre.`,
                    },
                  });

                  sendPushNotification(coord.id, {
                    title: coordTitle,
                    body: `O aluno ${student.name} apresenta uma taxa média de faltas de ${studentAverageAbsenceRate}% no semestre.`,
                    data: { type: 'RISCO_EVASAO', studentId: student.id },
                  });
                }
              }
            }
          }
        }

        // C) Coordenador (Absenteísmo por Turma/Matéria > 30% na média da turma)
        if (studentsChecked > 0) {
          const classAverageAbsenceRate = Math.round(classTotalAbsenceRate / studentsChecked);

          if (classAverageAbsenceRate > 30) {
            const classTitle = `Absenteísmo Elevado: ${cls.subject}`;

            // Filtrar coordenadores apenas do curso desta matéria
            const targetCoords = cls.course_id
              ? coordinators.filter((coord) =>
                  coord.userCourses.some((uc) => uc.course_id === cls.course_id)
                )
              : coordinators;

            for (const coord of targetCoords) {
              const coordClassAlreadyAlerted = await prisma.notification.findFirst({
                where: {
                  user_id: coord.id,
                  title: classTitle,
                  created_at: {
                    gte: sevenDaysAgo,
                  },
                },
              });

              if (!coordClassAlreadyAlerted) {
                await prisma.notification.create({
                  data: {
                    user_id: coord.id,
                    title: classTitle,
                    body: `A matéria ${cls.subject} (Professor: ${cls.professor.name}) apresenta uma taxa de absenteísmo preocupante de ${classAverageAbsenceRate}% entre os alunos matriculados.`,
                  },
                });

                sendPushNotification(coord.id, {
                  title: classTitle,
                  body: `A matéria ${cls.subject} atingiu ${classAverageAbsenceRate}% de absenteísmo.`,
                  data: { type: 'ABSENTEISMO_TURMA', classId: cls.id },
                });
              }
            }
          }
        }
      }
    }
    console.log('[EVASION JOB] Verificação diária de Risco de Evasão concluída.');
  } catch (error) {
    console.error('[EVASION JOB] Erro ao executar verificação de evasão:', error);
  }
}
