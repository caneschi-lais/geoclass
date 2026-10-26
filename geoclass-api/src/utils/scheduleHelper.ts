/**
 * Utilitário para resolução de horários (slots) por dia da semana.
 * Trata casos onde uma matéria possui aulas em mais de um dia na semana (ex: terca e quarta)
 * e divide ou mapeia os slots correspondentes para cada dia.
 */

import { getBrazilDayOfWeek } from './dateUtils';

export function getScheduleSlotsForDay(
  scheduleTime?: string | null,
  weekDays?: string | null,
  targetDateOrDayName?: Date | string | null
): string[] {
  if (!scheduleTime) return ['19:00', '19:50', '20:50', '21:40'];

  const cleanSchedule = scheduleTime.trim();

  // Obter o dayName se targetDateOrDayName for Date ou string (fuso de Brasília)
  const dayName = targetDateOrDayName ? getBrazilDayOfWeek(targetDateOrDayName) : getBrazilDayOfWeek();

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

    if (parts.length > 0) {
      const colonIndex = parts[0].indexOf(':');
      const timePart = colonIndex !== -1 ? parts[0].substring(colonIndex + 1) : parts[0];
      return timePart.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // 2. Formato padrão com vírgulas (ex: "19:00, 19:50" ou "19:00, 19:50, 20:50, 21:40")
  const allSlots = cleanSchedule.split(',').map((s) => s.trim()).filter(Boolean);
  if (allSlots.length === 0) {
    return ['19:00', '19:50', '20:50', '21:40'];
  }

  if (!weekDays) return allSlots;

  const normalizedWeekDays = weekDays
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const daysList = normalizedWeekDays.split(',').map((d) => d.trim()).filter(Boolean);

  // Se a matéria só tiver 1 dia letivo associado, retorna exatamente os horários daquele dia
  // (Ex: se tem 2 horários -> retorna os 2; se tem 4 horários -> retorna os 4)
  if (daysList.length <= 1) {
    return allSlots;
  }

  // Se houver múltiplos dias (ex: 2 dias: 'terca' e 'quarta') e mais horários do que dias
  // Exemplo: 4 aulas na semana divididas em 2 dias = 2 aulas por dia
  if (allSlots.length > daysList.length && allSlots.length % daysList.length === 0) {
    const slotsPerDay = allSlots.length / daysList.length;

    if (dayName) {
      const currentNormalizedDay = dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dayIndex = daysList.findIndex(
        (d) => d === currentNormalizedDay || d.includes(currentNormalizedDay) || currentNormalizedDay.includes(d)
      );

      if (dayIndex !== -1) {
        const start = dayIndex * slotsPerDay;
        return allSlots.slice(start, start + slotsPerDay);
      }
    }

    // Se o dia não foi informado ou não bate com os dias da turma, retorna a quantidade por dia
    return allSlots.slice(0, slotsPerDay);
  }

  return allSlots;
}
