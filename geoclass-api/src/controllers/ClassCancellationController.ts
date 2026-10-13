import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

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
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
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

  let dayIndex: number;
  if (typeof dateInput === 'string') {
    const [year, month, day] = dateInput.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    dayIndex = d.getDay();
  } else if (dateInput instanceof Date) {
    dayIndex = dateInput.getUTCDay();
  } else {
    dayIndex = new Date().getDay();
  }

  const daysOfWeekMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const dayName = daysOfWeekMap[dayIndex];

  const normalizedWeekDays = weekDays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const days = normalizedWeekDays.split(',').map((d) => d.trim());
  return days.some((d) => d.includes(dayName) || dayName.includes(d));
}

function saveBase64File(base64Data: string, originalFilename = 'documento.pdf'): string | null {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads/atestados');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let ext = path.extname(originalFilename).toLowerCase();
    if (!ext || ext === '.') {
      if (base64Data.startsWith('data:image/jpeg') || base64Data.startsWith('data:image/jpg')) ext = '.jpg';
      else if (base64Data.startsWith('data:image/png')) ext = '.png';
      else ext = '.pdf';
    }

    const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, '');
    const filename = `atestado-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
    return `/uploads/atestados/${filename}`;
  } catch (error) {
    console.error('Erro ao salvar arquivo base64:', error);
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
            course_name: classData.course_name,
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
      const formattedDate = formatDateDisplay(targetDate);
      const professor = professorId
        ? await prisma.user.findUnique({ where: { id: professorId }, select: { name: true } })
        : null;
      const professorName = professor?.name || req.user?.name || 'Professor';

      for (const coord of coordinators) {
        await prisma.notification.create({
          data: {
            user_id: coord.id,
            title: `Aviso de Falta: Prof. ${professorName}`,
            body: `O professor ${professorName} informou ausência para ${classData.subject} em ${formattedDate}. Motivo: ${reasonLabel}${description ? ` (${description})` : ''}.${certificateUrl ? ' Atestado anexado.' : ''}`,
          },
        });
      }

      return res.status(201).json({
        message: 'Aviso de ausência registrado com sucesso e enviado para aprovação da coordenação.',
        cancellation,
      });
    } catch (error) {
      console.error('Erro ao reportar falta do professor:', error);
      return res.status(500).json({ error: 'Erro interno ao registrar ausência.' });
    }
  }

  // 2. Coordenador lista solicitações pendentes
  async listPendingRequests(req: AuthRequest, res: Response) {
    try {
      const requests = await (prisma as any).classCancellation.findMany({
        where: { status: 'PENDENTE' },
        include: {
          class: true,
          professor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { date: 'asc' },
      });

      return res.json(requests);
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes:', error);
      return res.status(500).json({ error: 'Erro ao listar solicitações de ausência.' });
    }
  }

  async listPendingAbsenceRequests(req: AuthRequest, res: Response) {
    return this.listPendingRequests(req, res);
  }

  // 3. Coordenador aprova a falta do professor
  async approveAbsence(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
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
        where: { id },
        data: { status: 'APROVADO' },
      });

      const classData = cancellation.class;
      const targetDate = cancellation.date;
      const formattedDate = formatDateDisplay(targetDate);
      const reasonLabel = REASON_LABELS[cancellation.reason_type] || cancellation.reason_type;

      if (classData) {
        // Gerar Presença Parcial para todos os alunos matriculados nos slots da matéria
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

      // Notificar Professor da aprovação
      if (cancellation.professor_id) {
        await prisma.notification.create({
          data: {
            user_id: cancellation.professor_id,
            title: 'Ausência Aprovada pela Coordenação',
            body: `Sua ausência para a turma ${classData?.subject || ''} no dia ${formattedDate} foi aprovada. Lembre-se de definir a data de reposição.`,
          },
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
    const { id } = req.params;
    const { justification } = req.body;

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      const updated = await (prisma as any).classCancellation.update({
        where: { id },
        data: { status: 'REJEITADO' },
      });

      if (cancellation.professor_id) {
        const formattedDate = formatDateDisplay(cancellation.date);
        await prisma.notification.create({
          data: {
            user_id: cancellation.professor_id,
            title: 'Ausência Recusada pela Coordenação',
            body: `Sua solicitação de ausência para ${cancellation.class?.subject} em ${formattedDate} foi recusada.${justification ? ` Motivo da coordenação: ${justification}` : ''}`,
          },
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
    const { id } = req.params;

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
        include: { class: true },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Solicitação não encontrada.' });
      }

      if (!cancellation.professor_id) {
        return res.status(400).json({ error: 'Não há professor vinculado a esta ausência.' });
      }

      const formattedDate = formatDateDisplay(cancellation.date);
      await prisma.notification.create({
        data: {
          user_id: cancellation.professor_id,
          title: 'Solicitação de Atestado Médico',
          body: `A coordenação solicita o envio do atestado médico para a aula de ${cancellation.class?.subject || ''} do dia ${formattedDate}. Por favor, anexe o documento pelo aplicativo.`,
        },
      });

      return res.json({ message: 'Notificação enviada ao professor solicitando o atestado.' });
    } catch (error) {
      console.error('Erro ao solicitar atestado:', error);
      return res.status(500).json({ error: 'Erro ao solicitar atestado.' });
    }
  }

  // 6. Professor anexa/envia atestado médico
  async uploadCertificate(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { certificate_base64, certificate_filename } = req.body;

    if (!certificate_base64) {
      return res.status(400).json({ error: 'Nenhum arquivo base64 enviado.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
        include: { class: true, professor: { select: { name: true } } },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Registro de ausência não encontrado.' });
      }

      const certificateUrl = saveBase64File(certificate_base64, certificate_filename);
      if (!certificateUrl) {
        return res.status(500).json({ error: 'Falha ao processar o arquivo enviado.' });
      }

      const updated = await (prisma as any).classCancellation.update({
        where: { id },
        data: { certificate_url: certificateUrl },
      });

      // Notificar coordenadores sobre o envio
      const coordinators = await prisma.user.findMany({
        where: { role: 'COORDENADOR', active: true },
      });

      const formattedDate = formatDateDisplay(cancellation.date);
      const professorName = cancellation.professor?.name || req.user?.name || 'Professor';
      for (const coord of coordinators) {
        await prisma.notification.create({
          data: {
            user_id: coord.id,
            title: `Atestado Enviado: ${professorName}`,
            body: `O professor ${professorName} enviou o atestado médico referente à aula de ${cancellation.class?.subject} em ${formattedDate}.`,
          },
        });
      }

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
        },
        include: {
          class: {
            select: {
              id: true,
              subject: true,
              course_name: true,
              schedule_time: true,
              room_name: true,
              week_days: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      return res.json(absences);
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

      // Buscar turmas afetadas
      let affectedClasses: any[] = [];
      if (scope === 'TURMA') {
        if (class_id) {
          const c = await prisma.class.findUnique({
            where: { id: class_id },
            include: { enrollments: true, professor: true },
          });
          if (c) affectedClasses.push(c);
        } else if (req.body.subject_name || req.body.subject) {
          const subj = String(req.body.subject_name || req.body.subject).trim();
          affectedClasses = await prisma.class.findMany({
            where: { subject: { contains: subj, mode: 'insensitive' }, active: true },
            include: { enrollments: true, professor: true },
          });
        }
      } else if (scope === 'CURSO' && course_name) {
        const cName = String(course_name).trim();
        affectedClasses = await prisma.class.findMany({
          where: { course_name: { contains: cName, mode: 'insensitive' }, active: true },
          include: { enrollments: true, professor: true },
        });
      } else {
        // INSTITUICAO
        affectedClasses = await prisma.class.findMany({
          where: { active: true },
          include: { enrollments: true, professor: true },
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
            course_name: scope === 'CURSO' ? course_name : null,
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
              course_name: scope === 'CURSO' ? course_name : null,
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
              course_name: cls.course_name,
              replacement_date: replacementDateObj,
              created_by_role: 'COORDENADOR',
            },
          });
        } else {
          cancellation = await prisma.classCancellation.create({
            data: {
              class_id: cls.id,
              course_name: cls.course_name,
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

        // Gerar Presença Parcial para os alunos da turma
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
    const { id } = req.params;
    const { replacement_date } = req.body;

    if (!replacement_date) {
      return res.status(400).json({ error: 'A data de reposição é obrigatória.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
        include: {
          class: {
            include: { enrollments: true },
          },
        },
      });

      if (!cancellation) {
        return res.status(404).json({ error: 'Registro de cancelamento não encontrado.' });
      }

      const repDateObj = parseDateOnly(replacement_date);
      const updated = await (prisma as any).classCancellation.update({
        where: { id },
        data: { replacement_date: repDateObj },
      });

      const formattedOriginalDate = formatDateDisplay(cancellation.date);
      const formattedRepDate = formatDateDisplay(repDateObj);

      // Notificar Alunos sobre a data de reposição
      if (cancellation.class) {
        for (const enrollment of cancellation.class.enrollments) {
          await prisma.notification.create({
            data: {
              user_id: enrollment.student_id,
              title: `Reposição Agendada: ${cancellation.class.subject}`,
              body: `A reposição da aula de ${cancellation.class.subject} (referente ao dia ${formattedOriginalDate}) foi agendada para ${formattedRepDate}.`,
            },
          });
        }
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
    const classId = req.params.id;

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
    const { id } = req.params;
    const { attended_student_ids } = req.body; // Array com IDs dos alunos que estiveram presentes

    if (!Array.isArray(attended_student_ids)) {
      return res.status(400).json({ error: 'attended_student_ids deve ser um array com os IDs dos alunos presentes.' });
    }

    try {
      const cancellation = await (prisma as any).classCancellation.findUnique({
        where: { id },
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
        where: { id },
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
}
