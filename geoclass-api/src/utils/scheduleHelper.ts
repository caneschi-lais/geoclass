/**
 * Utilitário para resolução de horários (slots) por dia da semana.
 * Trata casos onde uma matéria possui aulas em mais de um dia na semana (ex: terca e quarta)
 * e divide ou mapeia os slots correspondentes para cada dia.
 */

export function getScheduleSlotsForDay(
  scheduleTime: string,
  weekDays?: string | null,
  dayName?: string
): string[] {
  if (!scheduleTime) return [];

  const cleanSchedule = scheduleTime.trim();

  // 1. Suporte a formato explícito por dia:
  // Exemplo: "terca: 19:00, 19:50 | quarta: 20:50, 21:40" ou com ponto-e-vírgula ";"
  if (cleanSchedule.includes(':') && (cleanSchedule.includes('|') || cleanSchedule.includes(';'))) {
    const parts = cleanSchedule.split(/[|;]/).map((p) => p.trim());
    if (dayName) {
      const normalizedDay = dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = parts.find((p) => {
        const normP = p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return normP.startsWith(normalizedDay);
      });

      if (match) {
        const colonIndex = match.indexOf(':');
        const timePart = colonIndex !== -1 ? match.substring(colonIndex + 1) : '';
        return timePart.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  // 2. Formato padrão com vírgulas (ex: "19:00, 19:50, 20:50, 21:40")
  const allSlots = cleanSchedule.split(',').map((s) => s.trim()).filter(Boolean);
  if (!weekDays || !dayName) return allSlots;

  const normalizedWeekDays = weekDays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const daysList = normalizedWeekDays.split(',').map((d) => d.trim()).filter(Boolean);

  // Se a matéria só tiver 1 dia letivo associado, todos os slots pertencem a esse dia
  if (daysList.length <= 1) {
    return allSlots;
  }

  // Se houver múltiplos dias (ex: 2 dias: 'terca' e 'quarta') e os slots puderem ser divididos igualmente:
  // Ex: 4 slots divididos por 2 dias = 2 slots para o primeiro dia, 2 slots para o segundo dia
  const currentNormalizedDay = dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const dayIndex = daysList.findIndex((d) => d === currentNormalizedDay || d.includes(currentNormalizedDay) || currentNormalizedDay.includes(d));

  if (dayIndex !== -1 && allSlots.length % daysList.length === 0) {
    const slotsPerDay = allSlots.length / daysList.length;
    const start = dayIndex * slotsPerDay;
    return allSlots.slice(start, start + slotsPerDay);
  }

  return allSlots;
}
