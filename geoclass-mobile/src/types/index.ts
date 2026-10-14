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
  isAbsent?: boolean;
  attendanceStatus?: 'PRESENTE' | 'FALTA' | 'ATRASADO' | 'PRESENCA_PARCIAL' | null;
  isCourseCompleted?: boolean;
}

export interface DashboardStat {
  id: string;
  subject: string;
  attendancePercentage: number;
  status: 'Aprovado' | 'Reprovado' | 'Em Risco';
  attendedClasses?: number;
  totalClasses?: number;
}

export interface AttendanceLog {
  id: string;
  date: string;
  time: string;
  subject: string;
  status?: 'PRESENTE' | 'FALTA' | 'ATRASADO' | 'PRESENCA_PARCIAL';
}

export type UserRole = 'ALUNO' | 'PROFESSOR' | 'COORDENADOR';

export interface SlotAttendance {
  slot_index: number;
  slot_time: string;
  label: string;
  isPresent: boolean;
  status: 'PRESENTE' | 'FALTA' | 'ATRASADO';
  attendance_id?: string | null;
}

export interface StudentAttendance {
  id: string;
  attendance_id?: string;
  name: string;
  ra: string;
  email?: string;
  time?: string; // Hora que bateu o ponto
  status?: 'PRESENTE' | 'FALTA' | 'ATRASADO' | 'PRESENCA_PARCIAL';
  presentSlotsCount?: number;
  totalSlots?: number;
  slots?: SlotAttendance[];
  slotsMap?: Record<string, boolean>;
  device_id?: string | null;
  has_device?: boolean;
  student_semester?: string;
  courses?: string[];
  userCourses?: UserCourseInfo[];
  active?: boolean;
  classSlots?: string[];
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


