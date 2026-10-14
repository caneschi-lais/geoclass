import prisma from '../prisma';

export interface CalendarCheckResult {
  isInstructional: boolean;
  reason?: string;
  type?: string;
}

/**
 * Verifica se a data informada é um dia letivo oficial (com aulas e frequência válidas).
 * Um dia NÃO é letivo se:
 * 1. For domingo;
 * 2. Estiver fora do período de início e término das aulas dos semestres cadastrados;
 * 3. Constar como registro em AcademicCalendar (feriado, recesso, emenda, SPAP ou exame final).
 */
export async function isAcademicInstructionalDay(
  targetDate: Date = new Date()
): Promise<CalendarCheckResult> {
  // 1. Domingo nunca é dia letivo
  if (targetDate.getDay() === 0) {
    return {
      isInstructional: false,
      reason: 'Domingo (Sem aulas regulares)',
      type: 'DOMINGO',
    };
  }

  const dateOnly = new Date(targetDate);
  dateOnly.setHours(0, 0, 0, 0);

  // 2. Verificar se a data possui bloqueio explícito no calendário acadêmico
  const calendarEntry = await prisma.academicCalendar.findUnique({
    where: { date: dateOnly },
  });

  if (calendarEntry) {
    return {
      isInstructional: false,
      reason: calendarEntry.description,
      type: calendarEntry.type,
    };
  }

  // 3. Verificar se está dentro do período letivo dos semestres cadastrados
  const semesters = await prisma.academicSemester.findMany({
    where: { active: true },
  });

  if (semesters.length > 0) {
    const isWithinAnySemester = semesters.some((sem) => {
      const start = new Date(sem.start_date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(sem.end_date);
      end.setHours(23, 59, 59, 999);
      return dateOnly >= start && dateOnly <= end;
    });

    if (!isWithinAnySemester) {
      return {
        isInstructional: false,
        reason: 'Fora do período letivo (Recesso ou Férias escolares)',
        type: 'RECESSO',
      };
    }
  }

  return { isInstructional: true };
}
