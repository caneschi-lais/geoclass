import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendPushNotification } from '../services/pushNotificationService';
import { getBrazilMidnightDate, getBrazilDayOfWeek } from '../utils/dateUtils';
import fs from 'fs';
import path from 'path';
import prisma from '../prisma';

const REASON_LABELS: Record<string, string> = {
  SAUDE: 'Problemas de saúde',
  PESSOAL: 'Problemas pessoais',
  ACADEMICO: 'Compromisso acadêmico / Congresso',
  TRANSPORTE: 'Dificuldade de transporte / deslocamento',
  MANUTENCAO: 'Manutenção na instituição',
  FERIADO_EXTRA: 'Feriado / Recesso institucional',
  OUTROS: 'Outros motivos',
};

function parseDateOnly(dateStr: string): Date {
  return getBrazilMidnightDate(dateStr);
}

function formatDateDisplay(d: Date | string): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const year = dateObj.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function isClassScheduledOnDate(weekDays?: string | null, dateInput?: Date | string): boolean {
  if (!weekDays || weekDays.trim() === '') return true;

  const dayName = getBrazilDayOfWeek(dateInput);

  const normalizedWeekDays = weekDays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const days = normalizedWeekDays.split(',').map((d) => d.trim());
  return days.some((d) => d.includes(dayName) || dayName.includes(d));
}

function saveBase64File(
  base64Data?: string | null,
  originalFilename = 'atestado.png'
): string | null {
  try {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.trim()) {
      return null;
    }

    const trimmed = base64Data.trim();
    // Tokens legados de simulação do app antigo: não cria arquivo falso
    if (trimmed === 'GENERATE_DIGITAL' || trimmed === 'GENERATE_OFFICIAL') {
      return null;
    }

    const uploadsDir = path.join(__dirname, '../../uploads/atestados');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let ext = path.extname(originalFilename || '').toLowerCase();
    if (!ext || ext === '.') {
      if (trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/jpg')) ext = '.jpg';
      else if (trimmed.startsWith('data:image/png')) ext = '.png';
      else if (trimmed.startsWith('data:application/pdf')) ext = '.pdf';
      else ext = '.png';
    }

    // Salva exatamente o anexo genuíno enviado pelo professor (sem simulação nem dados fictícios)
    const cleanBase64 = trimmed.replace(/^data:.*?;base64,/, '').trim();
    if (!cleanBase64) return null;

    const filename = `atestado-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    return `/uploads/atestados/${filename}`;
  } catch (error) {
    console.error('Erro ao salvar anexo do professor:', error);
    return null;
  }
}

export class ClassCancellationController {
  // 1. Professor informa que não dará aula
  async reportProfessorAbsence(req: AuthRequest, res: Response) {
    const professorId = req.user?.id;
    const {
      class_id,
      date,
      reason_type,
      description,
      certificate_base64,
      certificate_filename,
      replacement_date,
    } = req.body;

    if (!class_id || !date || !reason_type) {
      return res.status(400).json({ error: 'Campos obrigatórios: class_id, date e reason_type.' });
    }

    if (reason_type === 'OUTROS' && (!description || !description.trim())) {
      return res.status(400).json({ error: 'Para o motivo "Outros", o preenchimento da descrição é obrigatório.' });
    }

    try {
      const classData = await prisma.class.findUnique({
        where: { id: class_id },
      });

      if (!classData) {
        return res.status(404).json({ error: 'Turma não encontrada.' });
      }

      if (classData.professor_id !== professorId && req.user?.role !== 'COORDENADOR') {
        return res.status(403).json({ error: 'Apenas o professor responsável pode reportar falta nesta turma.' });
      }

      const targetDate = parseDateOnly(date);
      const replacementDateObj = replacement_date ? parseDateOnly(replacement_date) : null;

      const professor = professorId
        ? await prisma.user.findUnique({ where: { id: professorId }, select: { name: true } })
        : null;
      const professorName = professor?.name || req.user?.name || 'Professor';
      const formattedDate = formatDateDisplay(targetDate);

      let certificateUrl: string | null = null;
      if (certificate_base64) {
        certificateUrl = saveBase64File(certificate_base64, certificate_filename);
      }

      const existing = await prisma.classCancellation.findFirst({
        where: {
          class_id,
          date: targetDate,
        },
      });

      let cancellation;
      if (existing) {
        cancellation = await prisma.classCancellation.update({
          where: { id: existing.id },
          data: {
            reason_type,
            description: description ? description.trim() : null,
            certificate_url: certificateUrl || undefined,
            status: 'PENDENTE',
            replacement_date: replacementDateObj,
          },
        });
      } else {
        cancellation = await prisma.classCancellation.create({
          data: {
            class_id,
            course_id: classData.course_id,
            professor_id: professorId,
            date: targetDate,
            reason_type,
            description: description ? description.trim() : null,
            certificate_url: certificateUrl,
            status: 'PENDENTE',
            scope: 'TURMA',
            created_by_role: 'PROFESSOR',
            replacement_date: replacementDateObj,
          },
        });
      }

      // Notificar Coordenadores
      const coordinators = await prisma.user.findMany({
        where: { role: 'COORDENADOR', active: true },
      });

      const reasonLabel = REASON_LABELS[reason_type] || reason_type;

      for (const coord of coordinators) {
        await prisma.notification.create({
          data: {
            user_id: coord.id,
            title: `Aviso de Falta: Prof. ${professorName}`,
            body: `O professor ${professorName} informou ausência para ${classData.subject} em ${formattedDate}. Motivo: ${reasonLabel}${description ? ` (${description})` : ''}.${certificateUrl ? ' Atestado anexado.' : ''}`,
          },
        });
      }

      // Enviar push notification para os coordenadores
      const coordIds = coordinators.map((c) => c.id);
      sendPushNotification(coordIds, {
        title: `Aviso de Falta: Prof. ${professorName}`,
        body: `O prof. ${professorName} informou ausência para ${classData.subject} em ${formattedDate}.`,
        data: { type: 'AVISO_FALTA', cancellationId: cancellation.id },
      });

      return res.status(201).json({
        message: 'Aviso de ausência registrado com sucesso e enviado para aprovação da coordenação.',
        cancellation,
      });
    } catch (error) {
      console.error('Erro ao reportar falta do professor:', error);
      return res.status(500).json({ error: 'Erro interno ao registrar ausência.' });
    }
  }

  // 2. Coordenador lista solicitações (todas ou filtradas por status)
  async listPendingRequests(req: AuthRequest, res: Response) {
    const { status } = req.query as { status?: string };
    try {
      const whereClause: any = {};
      if (status && status !== 'TODOS' && status !== 'ALL') {
        whereClause.status = status;
      }

      const requests = await (prisma as any).classCancellation.findMany({
        where: whereClause,
        include: {
          class: true,
          professor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { date: 'desc' },
          { created_at: 'desc' },
        ],
      });

      return res.json(requests);
    } catch (error) {
      console.error('Erro ao listar solicitações:', error);
      return res.status(500).json({ error: 'Erro ao listar solicitações de ausência.' });
    }
  }

  async listPendingAbsenceRequests(req: AuthRequest, res: Response) {
    return this.listPendingRequests(req, res);
  }

  // 3. Coordenador aprova a falta do professor
  async approveAbsence(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: {
          class: {
            include: {
              enrollments: true,
            },
          },
          professor: true,
        },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      const updated = await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { status: 'APROVADO' },
      });

      const classData = cancellation.class;
      const targetDate = cancellation.date;
      const formattedDate = formatDateDisplay(targetDate);
      const reasonLabel = REASON_LABELS[cancellation.reason_type] || cancellation.reason_type;

      if (classData) {
        if (cancellation.reason_type === 'FERIADO_EXTRA') {
          // Feriados e emendas são dias não letivos: não deve haver registro de presença, ausência ou presença parcial
          await prisma.attendance.deleteMany({
            where: {
              class_id: classData.id,
              date: targetDate,
            },
          });

          // Apenas notificar alunos que não haverá aula
          for (const enrollment of classData.enrollments) {
            await prisma.notification.create({
              data: {
                user_id: enrollment.student_id,
                title: `Aviso: Feriado / Sem Aula (${classData.subject})`,
                body: `Não haverá aula de ${classData.subject} no dia ${formattedDate} devido a feriado/emenda (${reasonLabel}).`,
              },
            });
          }
        } else {
          // Gerar Presença Parcial para cancelamentos que exigem reposição
          const slots = classData.schedule_time.split(',').map((s: string) => s.trim());

          for (const enrollment of classData.enrollments) {
            for (const slotStr of slots) {
              const existingAttendance = await prisma.attendance.findFirst({
                where: {
                  student_id: enrollment.student_id,
                  class_id: classData.id,
                  date: targetDate,
                  slot_time: slotStr,
                },
              });

              if (existingAttendance) {
                await prisma.attendance.update({
                  where: { id: existingAttendance.id },
                  data: {
                    status: 'PRESENCA_PARCIAL',
                  },
                });
              } else {
                await prisma.attendance.create({
                  data: {
                    student_id: enrollment.student_id,
                    class_id: classData.id,
                    date: targetDate,
                    slot_time: slotStr,
                    check_in_time: new Date(),
                    status: 'PRESENCA_PARCIAL',
                  },
                });
              }
            }

            // Notificar Aluno
            await prisma.notification.create({
              data: {
                user_id: enrollment.student_id,
                title: `Aviso: Aula Cancelada (${classData.subject})`,
                body: `Não haverá aula de ${classData.subject} no dia ${formattedDate}. Motivo: ${reasonLabel}. Foi atribuída presença parcial até a realização da reposição.`,
              },
            });
          }
        }
      }

      // Notificar Professor da aprovação
      if (cancellation.professor_id) {
        await prisma.notification.create({
          data: {
            user_id: cancellation.professor_id,
            title: 'Ausência Aprovada pela Coordenação',
            body: `Sua ausência para a turma ${classData?.subject || ''} no dia ${formattedDate} foi aprovada. Lembre-se de definir a data de reposição.`,
          },
        });

        sendPushNotification(cancellation.professor_id, {
          title: 'Ausência Aprovada pela Coordenação',
          body: `Sua ausência para ${classData?.subject || ''} em ${formattedDate} foi aprovada.`,
          data: { type: 'AUSENCIA_APROVADA', classId: classData?.id },
        });
      }

      // Enviar push notification para os alunos matriculados
      if (classData?.enrollments) {
        const studentIds = classData.enrollments.map((e: any) => e.student_id);
        sendPushNotification(studentIds, {
          title: `Aviso: Aula Cancelada (${classData.subject})`,
          body: `Não haverá aula de ${classData.subject} no dia ${formattedDate}. Motivo: ${reasonLabel}.`,
          data: { type: 'AULA_CANCELADA', classId: classData.id },
        });
      }

      return res.json({
        message: 'Solicitação de ausência aprovada com sucesso. Presenças parciais geradas e alunos notificados.',
        cancellation: updated,
      });
    } catch (error) {
      console.error('Erro ao aprovar ausência:', error);
      return res.status(500).json({ error: 'Erro ao aprovar solicitação de ausência.' });
    }
  }

  // 4. Coordenador rejeita a falta
  async rejectAbsence(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }
    const { justification } = req.body;

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: { class: true },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      const updated = await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { status: 'REJEITADO' },
      });

      if (cancellation.professor_id) {
        const formattedDate = formatDateDisplay(cancellation.date);
        const notifTitle = 'Ausência Recusada pela Coordenação';
        const notifBody = `Sua solicitação de ausência para ${cancellation.class?.subject} em ${formattedDate} foi recusada.${justification ? ` Motivo da coordenação: ${justification}` : ''}`;
        await prisma.notification.create({
          data: {
            user_id: cancellation.professor_id,
            title: notifTitle,
            body: notifBody,
          },
        });

        sendPushNotification(cancellation.professor_id, {
          title: notifTitle,
          body: notifBody,
          data: { type: 'AUSENCIA_RECUSADA', cancellationId: cancellation.id },
        });
      }

      return res.json({ message: 'Solicitação de ausência recusada.', cancellation: updated });
    } catch (error) {
      console.error('Erro ao rejeitar ausência:', error);
      return res.status(500).json({ error: 'Erro ao rejeitar solicitação.' });
    }
  }

  // 5. Coordenador solicita envio do atestado ao professor
  async requestCertificate(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: { class: true },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      if (!cancellation.professor_id) {
        return res.status(400).json({ error: 'Não há professor vinculado a esta ausência.' });
      }

      const formattedDate = formatDateDisplay(cancellation.date);
      const notifTitle = 'Solicitação de Atestado Médico';
      const notifBody = `A coordenação solicita o envio do atestado médico para a aula de ${cancellation.class?.subject || ''} do dia ${formattedDate}. Por favor, anexe o documento pelo aplicativo.`;
      await prisma.notification.create({
        data: {
          user_id: cancellation.professor_id,
          title: notifTitle,
          body: notifBody,
        },
      });

      sendPushNotification(cancellation.professor_id, {
        title: notifTitle,
        body: notifBody,
        data: { type: 'SOLICITACAO_ATESTADO', cancellationId: cancellation.id },
      });

      return res.json({ message: 'Notificação enviada ao professor solicitando o atestado.' });
    } catch (error) {
      console.error('Erro ao solicitar atestado:', error);
      return res.status(500).json({ error: 'Erro ao solicitar atestado.' });
    }
  }

  // 6. Professor anexa/envia atestado médico
  async uploadCertificate(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }
    const { certificate_base64, certificate_filename } = req.body;

    if (!certificate_base64) {
      return res.status(400).json({ error: 'Nenhum arquivo base64 enviado.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: { class: true, professor: { select: { name: true } } },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Registro de ausência não encontrado.' });
      }

      const formattedDate = formatDateDisplay(cancellation.date);
      const professorName = cancellation.professor?.name || req.user?.name || 'Professor';

      const certificateUrl = saveBase64File(certificate_base64, certificate_filename);
      if (!certificateUrl) {
        return res.status(400).json({ error: 'Nenhum anexo válido foi processado.' });
      }

      const updated = await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { certificate_url: certificateUrl },
      });

      // Notificar coordenadores sobre o envio
      const coordinators = await prisma.user.findMany({
        where: { role: 'COORDENADOR', active: true },
      });

      for (const coord of coordinators) {
        await prisma.notification.create({
          data: {
            user_id: coord.id,
            title: `Atestado Enviado: ${professorName}`,
            body: `O professor ${professorName} enviou o atestado médico referente à aula de ${cancellation.class?.subject} em ${formattedDate}. Acesse o menu "Faltas & Aulas" para visualizar o atestado.`,
          },
        });
      }

      // Enviar push notification para os coordenadores
      const coordIds = coordinators.map((c) => c.id);
      sendPushNotification(coordIds, {
        title: `Atestado Enviado: ${professorName}`,
        body: `O professor ${professorName} enviou atestado médico referente a ${cancellation.class?.subject} em ${formattedDate}.`,
        data: { type: 'ATESTADO_ENVIADO', cancellationId: cancellation.id },
      });

      return res.json({
        message: 'Atestado médico anexado com sucesso!',
        certificate_url: certificateUrl,
        cancellation: updated,
      });
    } catch (error) {
      console.error('Erro ao anexar atestado:', error);
      return res.status(500).json({ error: 'Erro ao salvar atestado médico.' });
    }
  }

  // 6.1 Professor lista suas próprias solicitações de ausência e atestados
  async getProfessorAbsences(req: AuthRequest, res: Response) {
    const professorId = req.user?.id;
    if (!professorId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    try {
      const absences = await (prisma as any).classCancellation.findMany({
        where: {
          professor_id: professorId,
          reason_type: {
            in: ['SAUDE', 'PESSOAL', 'ACADEMICO', 'TRANSPORTE', 'OUTROS'],
          },
        },
        include: {
          course: { select: { name: true } },
          class: {
            select: {
              id: true,
              subject: true,
              schedule_time: true,
              week_days: true,
              room: { select: { name: true } },
              course: { select: { name: true } },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      const mapped = absences.map((a: any) => ({
        ...a,
        course_name: a.course?.name || a.class?.course?.name || null,
        class: a.class ? {
          ...a.class,
          room_name: a.class.room?.name || 'Sala Padrão',
          course_name: a.class.course?.name || null,
        } : null,
      }));

      return res.json(mapped);
    } catch (error) {
      console.error('Erro ao buscar ausências do professor:', error);
      return res.status(500).json({ error: 'Erro ao buscar ausências.' });
    }
  }

  // 7. Cancelamento Direto pelo Coordenador (Manutenção, Feriado extra, etc.)
  async coordinatorDirectCancellation(req: AuthRequest, res: Response) {
    const {
      scope, // "TURMA", "CURSO", "INSTITUICAO"
      date,
      reason_type,
      description,
      class_id,
      course_name,
      replacement_date,
    } = req.body;

    if (!scope || !date || !reason_type) {
      return res.status(400).json({ error: 'Campos obrigatórios: scope, date e reason_type.' });
    }

    try {
      const targetDate = parseDateOnly(date);
      const replacementDateObj = replacement_date ? parseDateOnly(replacement_date) : null;
      const formattedDate = formatDateDisplay(targetDate);
      const reasonLabel = REASON_LABELS[reason_type] || reason_type;

      let targetCourseId: number | null = null;
      if (course_name) {
        const cName = String(course_name).trim();
        const foundCourse = await prisma.course.findFirst({
          where: {
            OR: [
              { name: { contains: cName, mode: 'insensitive' } },
              { code: { contains: cName, mode: 'insensitive' } }
            ]
          }
        });
        if (foundCourse) {
          targetCourseId = foundCourse.id;
        }
      }

      // Buscar turmas afetadas
      let affectedClasses: any[] = [];
      if (scope === 'TURMA') {
        if (class_id) {
          const c = await prisma.class.findUnique({
            where: { id: class_id },
            include: { enrollments: true, professor: true, course: true },
          });
          if (c) affectedClasses.push(c);
        }
        if (affectedClasses.length === 0 && (req.body.subject_name || req.body.subject)) {
          const subj = String(req.body.subject_name || req.body.subject).trim();
          affectedClasses = await prisma.class.findMany({
            where: { subject: { contains: subj }, active: true },
            include: { enrollments: true, professor: true, course: true },
          });
        }
        if (affectedClasses.length === 0) {
          return res.status(404).json({ error: 'Nenhuma matéria ou turma ativa encontrada com as informações fornecidas.' });
        }
      } else if (scope === 'CURSO' && targetCourseId) {
        affectedClasses = await prisma.class.findMany({
          where: { course_id: targetCourseId, active: true },
          include: { enrollments: true, professor: true, course: true },
        });
      } else {
        // INSTITUICAO
        affectedClasses = await prisma.class.findMany({
          where: { active: true },
          include: { enrollments: true, professor: true, course: true },
        });
      }

      // Filtrar apenas as turmas que realmente lecionam no dia da semana selecionado (quando INSTITUICAO ou CURSO)
      if (scope === 'INSTITUICAO' || scope === 'CURSO') {
        affectedClasses = affectedClasses.filter((cls) => isClassScheduledOnDate(cls.week_days, date));
      }

      const createdCancellations = [];

      // Sempre garantir que o registro geral institucional/curso exista para a data
      if (scope === 'INSTITUICAO' || scope === 'CURSO') {
        const existingGen = await prisma.classCancellation.findFirst({
          where: {
            date: targetDate,
            scope,
            course_id: scope === 'CURSO' ? targetCourseId : null,
            class_id: null,
          },
        });

        if (existingGen) {
          await prisma.classCancellation.update({
            where: { id: existingGen.id },
            data: {
              reason_type,
              description: description ? description.trim() : null,
              status: 'APROVADO',
              replacement_date: replacementDateObj,
              created_by_role: 'COORDENADOR',
            },
          });
        } else {
          await prisma.classCancellation.create({
            data: {
              date: targetDate,
              reason_type,
              description: description ? description.trim() : null,
              status: 'APROVADO',
              scope,
              course_id: scope === 'CURSO' ? targetCourseId : null,
              class_id: null,
              created_by_role: 'COORDENADOR',
              replacement_date: replacementDateObj,
            },
          });
        }
      }

      for (const cls of affectedClasses) {
        const existing = await prisma.classCancellation.findFirst({
          where: {
            class_id: cls.id,
            date: targetDate,
          },
        });

        let cancellation;
        if (existing) {
          cancellation = await prisma.classCancellation.update({
            where: { id: existing.id },
            data: {
              reason_type,
              description: description ? description.trim() : null,
              status: 'APROVADO',
              scope,
              course_id: cls.course_id,
              replacement_date: replacementDateObj,
              created_by_role: 'COORDENADOR',
            },
          });
        } else {
          cancellation = await prisma.classCancellation.create({
            data: {
              class_id: cls.id,
              course_id: cls.course_id,
              professor_id: cls.professor_id,
              date: targetDate,
              reason_type,
              description: description ? description.trim() : null,
              status: 'APROVADO',
              scope,
              created_by_role: 'COORDENADOR',
              replacement_date: replacementDateObj,
            },
          });
        }
        createdCancellations.push(cancellation);

        if (reason_type === 'FERIADO_EXTRA') {
          // Feriados e emendas são dias não letivos: não deve haver registro de presença, ausência ou presença parcial
          await prisma.attendance.deleteMany({
            where: {
              class_id: cls.id,
              date: targetDate,
            },
          });

          // Notificar Aluno que não haverá aula por ser feriado/emenda
          for (const enrollment of (cls.enrollments || [])) {
            await prisma.notification.create({
              data: {
                user_id: enrollment.student_id,
                title: `Aviso Institucional: Feriado / Sem Aula (${cls.subject})`,
                body: `A coordenação informou que não haverá aula de ${cls.subject} em ${formattedDate}. Motivo: ${reasonLabel}${description ? ` (${description})` : ''}.`,
              },
            });
          }
        } else {
          // Gerar Presença Parcial para os alunos da turma quando exigir reposição
          const rawSchedule = cls.schedule_time || '08:00';
          const slots = rawSchedule.split(',').map((s: string) => s.trim()).filter(Boolean);
          const slotsToProcess = slots.length > 0 ? slots : ['08:00'];

          for (const enrollment of (cls.enrollments || [])) {
            for (const slotStr of slotsToProcess) {
              const existingAttendance = await prisma.attendance.findFirst({
                where: {
                  student_id: enrollment.student_id,
                  class_id: cls.id,
                  date: targetDate,
                  slot_time: slotStr,
                },
              });

              if (existingAttendance) {
                await prisma.attendance.update({
                  where: { id: existingAttendance.id },
                  data: {
                    status: 'PRESENCA_PARCIAL',
                  },
                });
              } else {
                await prisma.attendance.create({
                  data: {
                    student_id: enrollment.student_id,
                    class_id: cls.id,
                    date: targetDate,
                    slot_time: slotStr,
                    check_in_time: new Date(),
                    status: 'PRESENCA_PARCIAL',
                  },
                });
              }
            }

            // Notificar Aluno
            await prisma.notification.create({
              data: {
                user_id: enrollment.student_id,
                title: `Aviso Institucional: Sem Aula (${cls.subject})`,
                body: `A coordenação informou que não haverá aula de ${cls.subject} em ${formattedDate}. Motivo: ${reasonLabel}${description ? ` (${description})` : ''}.`,
              },
            });
          }
        }

        // Notificar Professor
        if (cls.professor_id) {
          await prisma.notification.create({
            data: {
              user_id: cls.professor_id,
              title: `Aviso Institucional: Aula Suspensa (${cls.subject})`,
              body: `A coordenação suspendeu as atividades de ${cls.subject} no dia ${formattedDate}. Motivo: ${reasonLabel}${description ? ` (${description})` : ''}.`,
            },
          });
        }
      }

      // Enviar push para todos os alunos e professores afetados
      const allStudentIds = affectedClasses.flatMap((c) => c.enrollments.map((e: any) => e.student_id));
      const allProfessorIds = affectedClasses.map((c) => c.professor_id).filter(Boolean) as string[];

      if (allStudentIds.length > 0) {
        sendPushNotification(allStudentIds, {
          title: 'Aviso Institucional: Aula Suspensa',
          body: `A coordenação informou suspensão de aulas em ${formattedDate}. Motivo: ${reasonLabel}.`,
          data: { type: 'SUSPENSAO_AULA' },
        });
      }
      if (allProfessorIds.length > 0) {
        sendPushNotification(allProfessorIds, {
          title: 'Aviso Institucional: Atividades Suspensas',
          body: `A coordenação suspendeu as atividades em ${formattedDate}. Motivo: ${reasonLabel}.`,
          data: { type: 'SUSPENSAO_AULA' },
        });
      }

      return res.status(201).json({
        message: `Cancelamento de aulas registrado com sucesso para ${affectedClasses.length} turma(s).`,
        count: affectedClasses.length,
      });
    } catch (error) {
      console.error('Erro no cancelamento direto pela coordenação:', error);
      return res.status(500).json({ error: 'Erro ao registrar cancelamento de aula.' });
    }
  }

  // 8. Agendar ou Alterar Data de Reposição
  async scheduleReplacement(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }
    const { replacement_date } = req.body;

    if (!replacement_date) {
      return res.status(400).json({ error: 'A data de reposição é obrigatória.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: {
          class: {
            include: { enrollments: true, professor: true },
          },
        },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Registro de cancelamento não encontrado.' });
      }

      const repDateObj = parseDateOnly(replacement_date);
      const updated = await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { replacement_date: repDateObj },
      });

      const formattedOriginalDate = formatDateDisplay(cancellation.date);
      const formattedRepDate = formatDateDisplay(repDateObj);
      const subjectName = cancellation.class?.subject || cancellation.subject_name || 'Aula';

      // Notificar Alunos sobre a data de reposição
      if (cancellation.class?.enrollments) {
        for (const enrollment of cancellation.class.enrollments) {
          await prisma.notification.create({
            data: {
              user_id: enrollment.student_id,
              title: `Reposição Agendada: ${subjectName}`,
              body: `A reposição da aula de ${subjectName} (referente ao dia sem aula de ${formattedOriginalDate}) foi agendada para ${formattedRepDate}.`,
            },
          });
        }
      }

      // Notificar Professor da matéria (se quem agendou for a coordenação)
      const professorId = cancellation.class?.professor_id || cancellation.professor_id;
      if (professorId && professorId !== req.user?.id) {
        await prisma.notification.create({
          data: {
            user_id: professorId,
            title: `Reposição Agendada: ${subjectName}`,
            body: `A reposição da aula de ${subjectName} (referente ao dia sem aula de ${formattedOriginalDate}) foi definida para ${formattedRepDate}.`,
          },
        });

        sendPushNotification(professorId, {
          title: `Reposição Agendada: ${subjectName}`,
          body: `A reposição da aula de ${subjectName} foi definida para ${formattedRepDate}.`,
          data: { type: 'REPOSICAO_AGENDADA', classId: cancellation.class_id },
        });
      }

      if (cancellation.class?.enrollments) {
        const studentIds = cancellation.class.enrollments.map((e: any) => e.student_id);
        sendPushNotification(studentIds, {
          title: `Reposição Agendada: ${subjectName}`,
          body: `A reposição da aula de ${subjectName} foi agendada para ${formattedRepDate}.`,
          data: { type: 'REPOSICAO_AGENDADA', classId: cancellation.class_id },
        });
      }

      return res.json({
        message: 'Data de reposição agendada com sucesso!',
        cancellation: updated,
      });
    } catch (error) {
      console.error('Erro ao agendar reposição:', error);
      return res.status(500).json({ error: 'Erro ao agendar data de reposição.' });
    }
  }

  // 9. Listar Aulas com Reposição Pendente
  async getPendingReplacements(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const role = req.user?.role;

    try {
      const whereClause: any = {
        status: 'APROVADO',
        replacement_completed: false,
      };

      if (role === 'PROFESSOR') {
        whereClause.professor_id = userId;
      }

      const replacements = await (prisma as any).classCancellation.findMany({
        where: whereClause,
        include: {
          class: {
            include: {
              enrollments: {
                include: { student: true },
              },
            },
          },
          professor: {
            select: { id: true, name: true },
          },
        },
        orderBy: { date: 'desc' },
      });

      return res.json(replacements);
    } catch (error) {
      console.error('Erro ao buscar reposições pendentes:', error);
      return res.status(500).json({ error: 'Erro ao buscar reposições pendentes.' });
    }
  }

  // 10. Datas com Reposição de uma Turma (Para visualização no Calendário / Filtro)
  async getReplacementDatesForClass(req: AuthRequest, res: Response) {
    const classId = Number(req.params.id);

    try {
      const cancellations = await (prisma as any).classCancellation.findMany({
        where: {
          class_id: classId,
          status: 'APROVADO',
          replacement_date: { not: null },
        },
        select: {
          replacement_date: true,
        },
      });

      const dates = cancellations
        .filter((c: any) => c.replacement_date !== null)
        .map((c: any) => {
          const d = c.replacement_date instanceof Date ? c.replacement_date : new Date(c.replacement_date);
          const year = d.getUTCFullYear();
          const month = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        });

      return res.json(Array.from(new Set(dates)));
    } catch (error) {
      console.error('Erro ao buscar datas de reposição:', error);
      return res.status(500).json({ error: 'Erro ao buscar datas de reposição.' });
    }
  }

  // 11. Finalizar Reposição com Checkboxes (Presença Parcial -> Presente ou Falta)
  async submitReplacementAttendance(req: AuthRequest, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).json({ error: 'ID de solicitação inválido.' });
    }
    const { attended_student_ids } = req.body; // Array com IDs dos alunos que estiveram presentes

    if (!Array.isArray(attended_student_ids)) {
      return res.status(400).json({ error: 'attended_student_ids deve ser um array com os IDs dos alunos presentes.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: {
          class: {
            include: { enrollments: true },
          },
        },
      });

      if (!cancellation || !cancellation.class) {
        return res.status(404).json({ error: 'Cancelamento ou turma não encontrada.' });
      }

      const classData = cancellation.class;
      const originalDate = cancellation.date;

      // Buscar todos os registros de presença parcial desta aula nesta data original
      const partialAttendances = await prisma.attendance.findMany({
        where: {
          class_id: classData.id,
          date: originalDate,
          status: 'PRESENCA_PARCIAL' as any,
        },
      });

      for (const att of partialAttendances) {
        const isPresent = attended_student_ids.includes(att.student_id);
        const newStatus = isPresent ? 'PRESENTE' : 'FALTA';

        await prisma.attendance.update({
          where: { id: att.id },
          data: {
            status: newStatus as any,
          },
        });
      }

      // Marcar reposição como concluída
      const updated = await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { replacement_completed: true },
      });

      return res.json({
        message: 'Chamada da reposição realizada com sucesso! Presenças parciais convertidas.',
        updated_count: partialAttendances.length,
        cancellation: updated,
      });
    } catch (error) {
      console.error('Erro ao submeter chamada de reposição:', error);
      return res.status(500).json({ error: 'Erro ao processar chamada de reposição.' });
    }
  }

  // 13. Interface Web para Upload Direto de Atestado Real (Permite enviar via navegador mobile ou desktop)
  async renderWebUploadPage(req: Request, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).send('<h3>ID de solicitação inválido.</h3>');
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: { class: true, professor: { select: { name: true } } },
      });

      if (!cancellation) {
        return res.status(404).send('<h3>Solicitação de ausência não encontrada.</h3>');
      }

      const formattedDate = formatDateDisplay(cancellation.date);
      const professorName = cancellation.professor?.name || 'Professor(a)';
      const subject = cancellation.class?.subject || 'Disciplina';

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoClass - Enviar Atestado Médico</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f1f5f9; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; }
    .card { background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); width: 100%; max-width: 480px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; padding: 24px 20px; text-align: center; }
    .header h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .header p { font-size: 13px; opacity: 0.9; }
    .content { padding: 24px 20px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-value { color: #0f172a; font-weight: 700; }
    .dropzone { border: 2px dashed #93c5fd; background: #eff6ff; border-radius: 14px; padding: 24px 16px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 18px; }
    .dropzone:hover { background: #dbeafe; border-color: #3b82f6; }
    .dropzone svg { width: 42px; height: 42px; color: #0284c7; margin-bottom: 8px; }
    .file-input { display: none; }
    .selected-name { font-size: 13px; color: #0369a1; font-weight: 600; margin-top: 8px; word-break: break-all; }
    .btn { display: block; width: 100%; background: #0284c7; color: white; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
    .btn:hover { background: #0369a1; }
    .btn:disabled { background: #94a3b8; cursor: not-allowed; }
    .btn-secondary { background: #f1f5f9; color: #475569; margin-top: 10px; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; }
    .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Envio de Atestado Médico</h1>
      <p>GeoClass &bull; Sistema Acadêmico Inteligente</p>
    </div>
    <div class="content">
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Docente:</span>
          <span class="info-value">${professorName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Disciplina:</span>
          <span class="info-value">${subject}</span>
        </div>
        <div class="info-row" style="margin-bottom:0;">
          <span class="info-label">Data da Falta:</span>
          <span class="info-value">${formattedDate}</span>
        </div>
      </div>

      <form id="uploadForm" method="POST" action="/api/cancellation/${cancellationId}/upload-web">
        <input type="hidden" name="certificate_base64" id="certificate_base64" />
        <input type="hidden" name="certificate_filename" id="certificate_filename" />

        <div class="dropzone" id="dropArea" onclick="document.getElementById('fileInput').click()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <div style="font-weight:700; color:#1e293b; font-size:14px;">Toque para selecionar a foto ou PDF</div>
          <div style="font-size:12px; color:#64748b; margin-top:4px;">Suporta câmera, galeria ou arquivos PDF</div>
          <div class="selected-name" id="fileNameDisplay"></div>
        </div>

        <input type="file" id="fileInput" class="file-input" accept="image/*,application/pdf" capture="environment" onchange="handleFileSelected(event)" />

        <button type="submit" id="submitBtn" class="btn" disabled>Confirmar Envio do Atestado</button>
      </form>

      <div class="footer">O documento será analisado e arquivado pela Coordenação de Curso.</div>
    </div>
  </div>

  <script>
    function handleFileSelected(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      document.getElementById('fileNameDisplay').innerText = '✔ ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      const reader = new FileReader();
      reader.onload = function(evt) {
        document.getElementById('certificate_base64').value = evt.target.result;
        document.getElementById('certificate_filename').value = file.name;
        document.getElementById('submitBtn').disabled = false;
      };
      reader.readAsDataURL(file);
    }
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      console.error('Erro ao renderizar página de upload:', error);
      return res.status(500).send('<h3>Erro interno ao carregar página de upload.</h3>');
    }
  }

  // 14. Processa o upload vindo da interface Web
  async handleWebUpload(req: Request, res: Response) {
    const cancellationId = Number(req.params.id);
    if (!cancellationId || isNaN(cancellationId)) {
      return res.status(400).send('<h3>ID de solicitação inválido.</h3>');
    }

    const { certificate_base64, certificate_filename } = req.body;
    if (!certificate_base64) {
      return res.status(400).send('<h3>Nenhum arquivo enviado. Retorne e selecione um documento.</h3>');
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id: cancellationId },
        include: { class: true, professor: { select: { name: true } } },
      });

      if (!cancellation) {
        return res.status(404).send('<h3>Solicitação de ausência não encontrada.</h3>');
      }

      const formattedDate = formatDateDisplay(cancellation.date);
      const professorName = cancellation.professor?.name || 'Professor(a)';

      // Salva exclusivamente o anexo enviado pelo professor
      const certificateUrl = saveBase64File(certificate_base64, certificate_filename || 'atestado.pdf');

      if (!certificateUrl) {
        return res.status(400).send('<h3>Falha ao processar arquivo enviado. Certifique-se de que é uma imagem ou PDF válido.</h3>');
      }

      await (prisma as any).classCancellation.update({
        where: { id: cancellationId },
        data: { certificate_url: certificateUrl },
      });

      // Notificar coordenadores
      const coordinators = await prisma.user.findMany({
        where: { role: 'COORDENADOR', active: true },
      });

      for (const coord of coordinators) {
        await prisma.notification.create({
          data: {
            user_id: coord.id,
            title: `Atestado Enviado: ${professorName}`,
            body: `O professor ${professorName} enviou o atestado médico referente à aula de ${cancellation.class?.subject} em ${formattedDate}. Acesse o menu "Faltas & Aulas" para visualizar o atestado.`,
          },
        });
      }

      const successHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atestado Enviado com Sucesso</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 16px; text-align: center; }
    .card { background: white; border-radius: 20px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
    .icon { width: 64px; height: 64px; background: #ecfdf5; color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; font-size: 32px; }
    h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    p { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .btn { display: inline-block; background: #0284c7; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 700; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10004;</div>
    <h2>Atestado Médico Anexado!</h2>
    <p>O documento foi recebido com sucesso e já está disponível para análise da Coordenação de Curso no aplicativo GeoClass.</p>
    <a href="${certificateUrl}" target="_blank" class="btn">Visualizar Documento Salvo</a>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(successHtml);
    } catch (error) {
      console.error('Erro ao processar envio web de atestado:', error);
      return res.status(500).send('<h3>Erro ao registrar atestado médico.</h3>');
    }
  }
}
