import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Auxiliar para adicionar 15 minutos a uma string "HH:MM"
function add15Minutes(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + 15, 0, 0);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export async function notificationJob() {
  const now = new Date();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;

  console.log(`[NOTIFICATION JOB] Iniciando execução às ${currentTimeStr}`);

  try {
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
      // 1. Aluno (Lembrete de Aula)
      // Se o horário de início da aula coincide com a hora atual
      if (cls.schedule_time === currentTimeStr) {
        console.log(`[NOTIFICATION JOB] Enviando lembretes de início de aula para: ${cls.subject}`);
        for (const enrollment of cls.enrollments) {
          const student = enrollment.student;

          // Evitar notificação duplicada hoje
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
                body: `Sua aula de ${cls.subject} começou às ${cls.schedule_time}. Não se esqueça de registrar sua presença nos próximos 15 minutos!`,
              },
            });
          }
        }
      }

      // 2. Professor (Fechamento de Chamada - 15min após início)
      const professorTriggerTime = add15Minutes(cls.schedule_time);
      if (professorTriggerTime === currentTimeStr) {
        console.log(`[NOTIFICATION JOB] Enviando relatório de chamada para professor de: ${cls.subject}`);
        
        // Contar quantos alunos marcaram presença hoje nesta turma
        const checkedInCount = await prisma.attendance.count({
          where: {
            class_id: cls.id,
            date: todayDate,
            status: { in: ['PRESENTE', 'ATRASADO'] },
          },
        });

        const totalStudents = cls.enrollments.length;
        const title = `Fechamento de Chamada: ${cls.subject}`;

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
          await prisma.notification.create({
            data: {
              user_id: cls.professor_id,
              title,
              body: `A tolerância de 15 minutos para a aula de ${cls.subject} encerrou. Total de presentes hoje: ${checkedInCount}/${totalStudents} alunos.`,
            },
          });
        }
      }
    }

    // 3. Alertas de Evasão e Absenteísmo (Aluno e Coordenador)
    // Para evitar rodar cálculos complexos de porcentagem a cada minuto, ou spammar notificações,
    // rodaremos este bloco apenas uma vez por dia (ex: às 12:00) ou se quisermos testar rápido.
    // Para garantir facilidade de demonstração/testes sem travar por hora, rodamos sempre mas com throttle de 7 dias nas notificações geradas.
    
    // Obter todos os coordenadores
    const coordinators = await prisma.user.findMany({
      where: { role: 'COORDENADOR' },
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
              await prisma.notification.create({
                data: {
                  user_id: student.id,
                  title: studentTitle,
                  body: `Seu índice de faltas em ${cls.subject} atingiu ${absenceRate}%. Fique atento para não ultrapassar o limite de faltas!`,
                },
              });
            }
          }

          // B) Coordenador (Risco de Evasão Individual do Aluno >= 25% na média geral)
          // Vamos calcular a média geral do aluno de forma independente
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
              for (const coord of coordinators) {
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
            for (const coord of coordinators) {
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
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[NOTIFICATION JOB] Erro ao executar job de notificações:', error);
  } finally {
    await prisma.$disconnect();
  }
}
