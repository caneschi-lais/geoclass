/**
 * Identificador de Semestre Atual Automático:
 * Janeiro a Junho -> YYYY.1
 * Julho a Dezembro -> YYYY.2
 */
export function getCurrentAcademicSemester(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  return month <= 6 ? `${year}.1` : `${year}.2`;
}

/**
 * Função utilitária para avançar o semestre letivo de um aluno.
 * Exemplo:
 *  "1º Semestre" -> "2º Semestre" (isCompleted: false)
 *  "5º Semestre" -> "6º Semestre" (isCompleted: false)
 *  "6º Semestre" -> "Concluído" (isCompleted: true)
 */
export function incrementStudentSemester(currentSemester?: string | null): {
  newSemester: string;
  isCompleted: boolean;
} {
  if (!currentSemester) {
    return { newSemester: '1º Semestre', isCompleted: false };
  }

  const match = currentSemester.match(/(\d+)/);
  if (!match) {
    return { newSemester: currentSemester, isCompleted: false };
  }

  const currentNum = parseInt(match[1], 10);
  const nextNum = currentNum + 1;

  // Em cursos tecnólogos típicos (ex: Fatec ADS), 6 semestres é o padrão de conclusão
  if (nextNum > 6) {
    return {
      newSemester: `${currentNum}º Semestre (Concluído)`,
      isCompleted: true
    };
  }

  return {
    newSemester: `${nextNum}º Semestre`,
    isCompleted: false
  };
}
