export interface ClassData {
  id: string;
  subject: string;
  professor: string;
  time: string; // "HH:mm"
  latitude: number;
  longitude: number;
  radiusMeters: number;
  room?: string;
}

export interface DashboardStat {
  id: string;
  subject: string;
  attendancePercentage: number;
  status: 'Aprovado' | 'Reprovado' | 'Em Risco';
}

export interface AttendanceLog {
  id: string;
  date: string;
  time: string;
  subject: string;
}

export type UserRole = 'ALUNO' | 'PROFESSOR' | 'COORDENADOR';

export interface StudentAttendance {
  id: string;
  name: string;
  ra: string;
  time: string; // Hora que bateu o ponto
}

export interface CoordinatorAnalytics {
  totalStudents: number;
  activeClasses: number;
}

export interface StudentRisk {
  id: string;
  name: string;
  ra: string;
  attendancePercentage: number;
}

