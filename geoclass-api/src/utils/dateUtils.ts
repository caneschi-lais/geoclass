/**
 * Utilitários de Data e Fuso Horário para o GeoClass.
 * Fuso horário canônico: Horário de Brasília ('America/Sao_Paulo', UTC-3).
 * Garante que validações de horários de aula, tolerância de 15 minutos,
 * chamadas e registros de ausência funcionem perfeitamente independente do país/região
 * onde a API ou o Banco de Dados estejam hospedados (Render, Supabase, AWS, etc.).
 */

export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export interface BrazilDateTimeParts {
  year: number;
  month: number; // 1 a 12
  day: number;
  hour: number;  // 0 a 23
  minute: number;
  second: number;
}

/**
 * Retorna os componentes da data/hora atual no Horário de Brasília.
 */
export function getBrazilParts(date: Date = new Date()): BrazilDateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // Trata meia-noite em versões específicas do V8

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour,
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Retorna a data no formato "YYYY-MM-DD" correspondente ao dia civil no Brasil.
 */
export function getBrazilDateString(date: Date = new Date()): string {
  const { year, month, day } = getBrazilParts(date);
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Retorna o dia da semana em português (ex: "segunda", "terca", "quarta") no Brasil.
 */
export function getBrazilDayOfWeek(dateInput?: Date | string | null): string {
  const daysOfWeekMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  if (!dateInput) {
    const { year, month, day } = getBrazilParts(new Date());
    const d = new Date(Date.UTC(year, month - 1, day));
    return daysOfWeekMap[d.getUTCDay()];
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        return daysOfWeekMap[d.getUTCDay()];
      }
    }
    return trimmed;
  }

  const { year, month, day } = getBrazilParts(dateInput);
  const d = new Date(Date.UTC(year, month - 1, day));
  return daysOfWeekMap[d.getUTCDay()];
}

/**
 * Retorna uma instância de Date normalizada para a meia-noite (00:00:00.000Z)
 * correspondente ao dia civil no Brasil.
 * Essencial para que consultas do Prisma no campo `date DateTime` sejam consistentes.
 */
export function getBrazilMidnightDate(dateInput?: Date | string | null): Date {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(Number);
      if (parts.length === 3) {
        return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0));
      }
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date();
  const { year, month, day } = getBrazilParts(d);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Cria um objeto Date normalizado no Horário de Brasília (UTC-3).
 * Trata nativamente estouro de minutos (ex: 50 + 15 = 65 -> 1h e 05min),
 * estouro de horas e dias via Date.UTC sem gerar strings ISO inválidas (NaN).
 */
export function createBrazilDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0
): Date {
  // Horário de Brasília possui offset canônico de UTC-3.
  // Em UTC, a hora correspondente é (hour + 3).
  // Date.UTC aceita minutos > 59 e ajusta automaticamente horas e dias.
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, second, 0));
}

/**
 * Converte string "HH:MM" em minutos decorridos desde as 00:00.
 */
export function parseSlotToMinutes(slotStr: string): number | null {
  const [h, m] = slotStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Avalia o status de um slot ("HH:MM") com tolerância de até 15 minutos em relação ao horário no Brasil.
 * Se houver um próximo slot (nextSlotStr), a tolerância do slot atual nunca ultrapassa o horário de início da próxima aula.
 */
export function evaluateSlotTime(
  slotStr: string,
  referenceDate: Date = new Date(),
  nextSlotStr?: string | null
) {
  const slotMinutes = parseSlotToMinutes(slotStr);
  if (slotMinutes === null) {
    return {
      isValid: false,
      isActive: false,
      isExpired: false,
      isFuture: false,
      startMinutes: 0,
      endMinutes: 0,
      currentMinutes: 0,
    };
  }

  const { hour, minute } = getBrazilParts(referenceDate);
  const currentMinutes = hour * 60 + minute;
  const defaultToleranceMinutes = 15;
  const startMinutes = slotMinutes;

  let endMinutes = slotMinutes + defaultToleranceMinutes;
  if (nextSlotStr) {
    const nextMinutes = parseSlotToMinutes(nextSlotStr);
    if (nextMinutes !== null && nextMinutes > startMinutes) {
      // A tolerância da aula atual encerra no início da próxima aula se a distância for menor que 15 min
      endMinutes = Math.min(endMinutes, nextMinutes);
    }
  }

  // O slot está ativo a partir do horário de início até antes de endMinutes
  const isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  const isExpired = currentMinutes >= endMinutes;
  const isFuture = currentMinutes < startMinutes;

  return {
    isValid: true,
    isActive,
    isExpired,
    isFuture,
    startMinutes,
    endMinutes,
    currentMinutes,
  };
}

