import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export class ProfessorController {
  async getTurmas(req: AuthRequest, res: Response) {
    const professorId = req.user?.id;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      const classes = await prisma.class.findMany({
        where: { professor_id: professorId },
        include: {
          temporaryLocs: {
            where: { date: todayStr }
          },
          _count: {
            select: { enrollments: true }
          }
        }
      });

      const turmas = classes.map(c => {
        const tempRoom = c.temporaryLocs && c.temporaryLocs.length > 0 ? c.temporaryLocs[0].room_name : null;
        return {
          id: c.id,
          subject: c.subject,
          time: c.schedule_time,
          room: tempRoom || c.room_name,
          enrolledCount: c._count.enrollments
        };
      });

      return res.json(turmas);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar turmas' });
    }
  }

  async getPresencasTurma(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { date } = req.query as { date?: string };

    let targetDate: Date;
    if (date && typeof date === 'string') {
      const parts = date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        targetDate = new Date(year, month - 1, day);
      } else {
        targetDate = new Date();
      }
    } else {
      targetDate = new Date();
    }
    targetDate.setHours(0, 0, 0, 0);

    try {
      const attendances = await prisma.attendance.findMany({
        where: {
          class_id: classId,
          date: targetDate,
          status: 'PRESENTE'
        },
        include: {
          student: true
        }
      });

      const presentes = attendances.map(a => ({
        id: a.student.id,
        name: a.student.name,
        ra: a.student.ra || 'N/A',
        time: a.check_in_time.toISOString().split('T')[1].substring(0, 5)
      }));

      return res.json(presentes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar presenças da turma' });
    }
  }

  async changeRoomTemporarily(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { roomId, date } = req.body; // date in YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ error: 'Data é obrigatória' });
    }

    try {
      if (!roomId) {
        // Restaurar sala padrão deletando a entrada temporária
        await prisma.temporaryClassLocation.deleteMany({
          where: { class_id: classId, date: String(date) }
        });
        return res.json({ message: 'Sala padrão restaurada com sucesso!' });
      }
      const classData = await prisma.class.findUnique({ where: { id: classId } });
      if (!classData) return res.status(404).json({ error: 'Turma não encontrada' });
      
      const roomData = await prisma.room.findUnique({ where: { id: roomId } });
      if (!roomData) return res.status(404).json({ error: 'Sala não encontrada' });

      // Verificação dupla de conflito
      const classesAtSameTime = await prisma.class.findMany({
        where: { schedule_time: classData.schedule_time, active: true },
        select: { room_name: true, id: true }
      });

      const temporaryLocsAtDate = await prisma.temporaryClassLocation.findMany({
        where: { date: String(date) },
        include: { class: true }
      });

      const busyTemporaryLocs = temporaryLocsAtDate.filter(loc => loc.class.schedule_time === classData.schedule_time);

      const isStandardOccupied = classesAtSameTime.some(c => {
        if (c.room_name === roomData.name && c.id !== classId) {
          const classHasTemporaryLocation = temporaryLocsAtDate.some(t => t.class_id === c.id);
          return !classHasTemporaryLocation; 
        }
        return false;
      });

      const isTemporarilyOccupied = busyTemporaryLocs.some(loc => loc.room_id === roomData.id && loc.class_id !== classId);

      if (isStandardOccupied || isTemporarilyOccupied) {
        return res.status(400).json({ error: 'Esta sala acabou de ser ocupada por outra turma neste horário.' });
      }

      // Salva ou atualiza a troca
      const tempLoc = await prisma.temporaryClassLocation.upsert({
        where: { class_id_date: { class_id: classId, date: String(date) } },
        update: {
          room_id: roomData.id,
          room_name: roomData.name,
          latitude: roomData.latitude,
          longitude: roomData.longitude
        },
        create: {
          class_id: classId,
          date: String(date),
          room_id: roomData.id,
          room_name: roomData.name,
          latitude: roomData.latitude,
          longitude: roomData.longitude
        }
      });

      return res.json({ message: 'Sala alterada com sucesso!', tempLoc });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alterar sala' });
    }
  }

  // Obter todos os alunos matriculados na turma
  async getEnrolledStudents(req: AuthRequest, res: Response) {
    const classId = req.params.id;

    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { class_id: classId },
        include: { student: true }
      });

      const students = enrollments.map(e => ({
        id: e.student.id,
        name: e.student.name,
        ra: e.student.ra || 'N/A'
      }));

      // Ordenar por nome
      students.sort((a, b) => a.name.localeCompare(b.name));

      return res.json(students);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar alunos matriculados' });
    }
  }

  // Registrar chamada manual (EAD)
  async registerManualAttendance(req: AuthRequest, res: Response) {
    const classId = req.params.id;
    const { attendances } = req.body; // array de { studentId, isPresent }

    if (!attendances || !Array.isArray(attendances)) {
      return res.status(400).json({ error: 'Dados de chamada inválidos' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Registrar tudo de uma vez usando loop (Prisma UPSERT não suporta transação em lote direto com data dinâmica fácil)
      for (const record of attendances) {
        await prisma.attendance.upsert({
          where: {
            student_id_class_id_date: {
              student_id: record.studentId,
              class_id: classId,
              date: today
            }
          },
          update: {
            status: record.isPresent ? 'PRESENTE' : 'FALTA',
            is_remote: true,
            manual_attendance: true
          },
          create: {
            student_id: record.studentId,
            class_id: classId,
            date: today,
            check_in_time: new Date(),
            status: record.isPresent ? 'PRESENTE' : 'FALTA',
            is_remote: true,
            manual_attendance: true
          }
        });
      }

      return res.json({ message: 'Chamada manual registrada com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar a chamada manual' });
    }
  }
}
