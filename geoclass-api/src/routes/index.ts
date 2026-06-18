import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AttendanceController } from '../controllers/AttendanceController';
import { StudentController } from '../controllers/StudentController';
import { ProfessorController } from '../controllers/ProfessorController';
import { RoomController } from '../controllers/RoomController';
import { CoordinatorController } from '../controllers/CoordinatorController';
import { NotificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const authController = new AuthController();
const attendanceController = new AttendanceController();
const studentController = new StudentController();
const professorController = new ProfessorController();
const coordinatorController = new CoordinatorController();
const roomController = new RoomController();
const notificationController = new NotificationController();

// Rotas Públicas
router.post('/login', authController.login);

// Rotas Privadas (Protegidas por JWT)
router.use(authMiddleware);

// --- Rotas do Aluno ---
router.post('/aluno/presenca', attendanceController.registrarPresenca);
router.get('/aluno/aulas/hoje', studentController.getAulasHoje);
router.get('/aluno/dashboard', studentController.getDashboard);
router.get('/aluno/historico', studentController.getHistorico);

// --- Rotas do Professor ---
router.get('/professor/turmas', professorController.getTurmas);
router.get('/professor/turma/:id/presencas', professorController.getPresencasTurma);
router.get('/professor/turma/:id/alunos', professorController.getEnrolledStudents);
router.post('/professor/turma/:id/chamada-manual', professorController.registerManualAttendance);
router.post('/professor/turma/:id/trocar-sala', professorController.changeRoomTemporarily);
router.get('/professor/salas-disponiveis', roomController.getAvailableRooms);
router.post('/professor/presenca/reset-device', professorController.resetDeviceBinding);

// --- Rotas do Coordenador ---
router.get('/coordenador/semestres', coordinatorController.getSemesters);
router.get('/coordenador/semestre/:id/alunos', coordinatorController.getStudentsBySemester);
router.get('/coordenador/semestre/:id/turmas', coordinatorController.getClassesBySemester);
router.get('/coordenador/aluno/:id/materias', coordinatorController.getStudentSubjects);
router.get('/coordenador/relatorio', coordinatorController.getReportData);
router.post('/coordenador/sala', coordinatorController.createRoom);
router.get('/coordenador/professores', coordinatorController.getProfessors);

// --- Rotas de Notificações ---
router.get('/notificacoes', notificationController.getNotifications);
router.put('/notificacoes/ler', notificationController.markAsRead);

export default router;
