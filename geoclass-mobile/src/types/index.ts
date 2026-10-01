export interface UserCourseInfo {
  course_name: string;
  semester?: string;
  is_completed?: boolean;
}

export interface ClassData {
  id: string;
  subject: string;
  course_name?: string;
  professor: string;
  time: string; // "HH:mm"
  latitude: number;
  longitude: number;
  radiusMeters: number;
  room?: string;
  enrolledCount?: number;
  alreadyCheckedIn?: boolean;
  isCourseCompleted?: boolean;
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
  email?: string;
  time?: string; // Hora que bateu o ponto
  student_semester?: string;
  courses?: string[];
  userCourses?: UserCourseInfo[];
  active?: boolean;
}

export interface CoordinatorAnalytics {
  totalStudents: number;
  activeClasses: number;
}

export interface StudentRisk {
  id: string;
  classId?: string;
  studentName?: string;
  name?: string;
  ra: string;
  email?: string;
  subject?: string;
  course_name?: string;
  semester?: string;
  presences?: number;
  totalClasses?: number;
  attendancePercentage: number;
  absencePercentage?: number;
  status?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}


