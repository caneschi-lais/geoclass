import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export class CoordinatorController {
  // 1. Obter semestres ativos e a média global de faltas
  async getSemesters(req: AuthRequest, res: Response) {
    try {
      // Pega todos os semestres distintos das turmas ativas
      const activeClasses = await prisma.class.findMany({
        where: { active: true },
        select: { semester: true },
        distinct: ['semester']
      });

      const semestersList = await Promise.all(activeClasses.map(async (cls) => {
        const semester = cls.semester;
        
        // Buscar todas as matrículas deste semestre
        const enrollments = await prisma.enrollment.findMany({
          where: { class: { semester, active: true } },
          include: { class: true }
        });

        if (enrollments.length === 0) {
          return { id: semester, name: semester, absencePercentage: 0 };
        }

        let totalExpectedClasses = 0;
        let totalAttendances = 0;

        for (const enr of enrollments) {
          totalExpectedClasses += enr.class.total_classes;
          const presencas = await prisma.attendance.count({
            where: { class_id: enr.class_id, student_id: enr.student_id, status: 'PRESENTE' }
          });
          totalAttendances += presencas;
        }

        // Faltas = Aulas Esperadas - Presenças
        const totalFaltas = totalExpectedClasses - totalAttendances;
        const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);

        return {
          id: semester,
          name: semester,
          absencePercentage
        };
      }));

      return res.json(semestersList);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar semestres' });
    }
  }

  // 2. Obter alunos de um semestre e suas médias de falta
  async getStudentsBySemester(req: AuthRequest, res: Response) {
    const { id: semester } = req.params; // ex: 2026.1

    try {
      // Buscar alunos com matrícula no semestre
      const students = await prisma.user.findMany({
        where: { 
          role: 'ALUNO',
          enrollments: {
            some: { class: { semester, active: true } }
          }
        },
        include: {
          enrollments: {
            where: { class: { semester, active: true } },
            include: { class: true }
          },
          attendances: {
            where: { class: { semester, active: true }, status: 'PRESENTE' }
          }
        }
      });

      const studentsData = students.map(student => {
        let totalExpectedClasses = 0;
        student.enrollments.forEach(enr => {
          totalExpectedClasses += enr.class.total_classes;
        });

        const totalAttendances = student.attendances.length;
        const totalFaltas = totalExpectedClasses - totalAttendances;
        const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);

        return {
          id: student.id,
          name: student.name,
          ra: student.ra || 'N/A',
          absencePercentage
        };
      });

      // Ordenar por alunos com MAIS faltas primeiro
      studentsData.sort((a, b) => b.absencePercentage - a.absencePercentage);

      return res.json(studentsData);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar alunos do semestre' });
    }
  }

  // 3. Obter matérias de um aluno em um semestre específico
  async getStudentSubjects(req: AuthRequest, res: Response) {
    const { id: studentId } = req.params;
    const { semester } = req.query as { semester: string };

    if (!semester) {
      return res.status(400).json({ error: 'Parâmetro semester é obrigatório' });
    }

    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { 
          student_id: studentId,
          class: { semester, active: true }
        },
        include: { class: true }
      });

      const subjectsData = await Promise.all(enrollments.map(async (enr) => {
        const presencas = await prisma.attendance.count({
          where: { student_id: studentId, class_id: enr.class_id, status: 'PRESENTE' }
        });

        const totalAulas = enr.class.total_classes;
        const faltas = totalAulas - presencas;
        const absencePercentage = totalAulas === 0 ? 0 : Math.round((faltas / totalAulas) * 100);

        return {
          classId: enr.class.id,
          subject: enr.class.subject,
          room_name: enr.class.room_name,
          total_classes: totalAulas,
          absencePercentage
        };
      }));

      // Ordenar por matérias com mais faltas primeiro
      subjectsData.sort((a, b) => b.absencePercentage - a.absencePercentage);

      return res.json(subjectsData);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar matérias do aluno' });
    }
  }

  // 4. Obter dados consolidados para Relatório (Exportação)
  async getReportData(req: AuthRequest, res: Response) {
    const { level, semesterId, studentId, includeDetails } = req.query;

    try {
      if (level === 'semesters') {
        const activeClasses = await prisma.class.findMany({ where: { active: true }, select: { semester: true }, distinct: ['semester'] });
        const data = await Promise.all(activeClasses.map(async (cls) => {
          const semester = cls.semester;
          const enrollments = await prisma.enrollment.findMany({ where: { class: { semester, active: true } }, include: { class: true } });
          
          let totalExpectedClasses = 0;
          let totalAttendances = 0;
          for (const enr of enrollments) {
            totalExpectedClasses += enr.class.total_classes;
            totalAttendances += await prisma.attendance.count({ where: { class_id: enr.class_id, student_id: enr.student_id, status: 'PRESENTE' } });
          }
          const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round(((totalExpectedClasses - totalAttendances) / totalExpectedClasses) * 100);

          let details: any = null;
          if (includeDetails === 'true') {
             // Detalhamento de alunos do semestre
             const students = await prisma.user.findMany({
               where: { role: 'ALUNO', enrollments: { some: { class: { semester, active: true } } } },
               include: {
                 enrollments: { where: { class: { semester, active: true } }, include: { class: true } },
                 attendances: { where: { class: { semester, active: true }, status: 'PRESENTE' } }
               }
             });
             details = students.map(student => {
               let sTotal = 0;
               student.enrollments.forEach(e => sTotal += e.class.total_classes);
               const sAbsence = sTotal === 0 ? 0 : Math.round(((sTotal - student.attendances.length) / sTotal) * 100);
               return { id: student.id, name: student.name, ra: student.ra, absencePercentage: sAbsence };
             });
          }

          return { semester, absencePercentage, details };
        }));
        return res.json(data);
      }

      if (level === 'students') {
        if (!semesterId) return res.status(400).json({ error: 'semesterId obrigatório' });
        
        const students = await prisma.user.findMany({
          where: { role: 'ALUNO', enrollments: { some: { class: { semester: String(semesterId), active: true } } } },
          include: {
            enrollments: { where: { class: { semester: String(semesterId), active: true } }, include: { class: true } },
            attendances: { where: { class: { semester: String(semesterId), active: true }, status: 'PRESENTE' } }
          }
        });

        const data = await Promise.all(students.map(async student => {
          let totalExpectedClasses = 0;
          student.enrollments.forEach(enr => { totalExpectedClasses += enr.class.total_classes; });
          const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round(((totalExpectedClasses - student.attendances.length) / totalExpectedClasses) * 100);

          let details: any = null;
          if (includeDetails === 'true') {
            details = await Promise.all(student.enrollments.map(async (enr) => {
              const presencas = await prisma.attendance.count({ where: { student_id: student.id, class_id: enr.class_id, status: 'PRESENTE' } });
              const cTotal = enr.class.total_classes;
              const cAbsence = cTotal === 0 ? 0 : Math.round(((cTotal - presencas) / cTotal) * 100);
              return { subject: enr.class.subject, room_name: enr.class.room_name, absencePercentage: cAbsence };
            }));
          }

          return { id: student.id, name: student.name, ra: student.ra, absencePercentage, details };
        }));
        return res.json(data);
      }

      return res.status(400).json({ error: 'Nível de relatório inválido' });
    } catch (error) {
      console.error('Erro getReportData', error);
      return res.status(500).json({ error: 'Erro interno ao gerar relatório' });
    }
  }

  // 5. Cadastrar nova sala
  async createRoom(req: AuthRequest, res: Response) {
    const { name, latitude, longitude, assignClass, subject, schedule_time, professor_id } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Nome, latitude e longitude são obrigatórios' });
    }

    try {
      const existingRoom = await prisma.room.findUnique({
        where: { name }
      });

      if (existingRoom) {
        return res.status(400).json({ error: 'Já existe uma sala com esse nome' });
      }

      if (assignClass) {
        if (!subject || !schedule_time || !professor_id) {
          return res.status(400).json({ error: 'Matéria, horário e professor são obrigatórios para vincular à turma' });
        }
        const professor = await prisma.user.findFirst({
          where: { id: professor_id, role: 'PROFESSOR' }
        });
        if (!professor) {
          return res.status(404).json({ error: 'Professor selecionado não foi encontrado' });
        }
      }

      const room = await prisma.room.create({
        data: {
          name,
          latitude: parseFloat(String(latitude)),
          longitude: parseFloat(String(longitude))
        }
      });

      let createdClass = null;
      if (assignClass) {
        createdClass = await prisma.class.create({
          data: {
            subject,
            schedule_time,
            professor_id,
            latitude: parseFloat(String(latitude)),
            longitude: parseFloat(String(longitude)),
            room_name: name,
            radius_meters: 50,
            semester: '2026.1',
            total_classes: 40
          }
        });
      }

      return res.status(201).json({ 
        message: 'Sala cadastrada com sucesso!', 
        room,
        class: createdClass 
      });
    } catch (error) {
      console.error('Erro createRoom', error);
      return res.status(500).json({ error: 'Erro ao cadastrar a sala' });
    }
  }

  // 6. Obter lista de professores cadastrados
  async getProfessors(req: AuthRequest, res: Response) {
    try {
      const professors = await prisma.user.findMany({
        where: { role: 'PROFESSOR' },
        select: {
          id: true,
          name: true,
          email: true
        },
        orderBy: { name: 'asc' }
      });
      return res.json(professors);
    } catch (error) {
      console.error('Erro getProfessors', error);
      return res.status(500).json({ error: 'Erro ao buscar professores' });
    }
  }

  // 7. Obter todas as turmas (matérias e professores) de um semestre
  async getClassesBySemester(req: AuthRequest, res: Response) {
    const { id: semester } = req.params;

    try {
      const classes = await prisma.class.findMany({
        where: { semester, active: true },
        include: {
          professor: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { subject: 'asc' }
      });

      return res.json(classes);
    } catch (error) {
      console.error('Erro getClassesBySemester', error);
      return res.status(500).json({ error: 'Erro ao buscar turmas do semestre' });
    }
  }
}

