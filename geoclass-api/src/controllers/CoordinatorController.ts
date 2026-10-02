import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getCurrentAcademicSemester, incrementStudentSemester } from '../utils/academicSemester';

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
          absencePercentage,
          is_completed: enr.is_completed || false
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

  // 8. Obter todos os alunos cadastrados
  async getAllStudents(req: AuthRequest, res: Response) {
    try {
      const students = await prisma.user.findMany({
        where: { role: 'ALUNO' },
        select: {
          id: true,
          name: true,
          email: true,
          ra: true,
          courses: true,
          student_semester: true,
          active: true,
        },
        orderBy: { name: 'asc' }
      });
      return res.json(students);
    } catch (error) {
      console.error('Erro getAllStudents', error);
      return res.status(500).json({ error: 'Erro ao buscar todos os alunos' });
    }
  }

  // 9. Matricular aluno em uma turma/matéria
  async enrollStudent(req: AuthRequest, res: Response) {
    const { student_id, class_id } = req.body;

    if (!student_id || !class_id) {
      return res.status(400).json({ error: 'ID do aluno e ID da matéria são obrigatórios' });
    }

    try {
      // Verificar se o aluno existe e é aluno
      const student = await prisma.user.findFirst({
        where: { id: student_id, role: 'ALUNO' }
      });
      if (!student) {
        return res.status(404).json({ error: 'Aluno não encontrado' });
      }

      // Verificar se a matéria existe
      const cls = await prisma.class.findFirst({
        where: { id: class_id, active: true }
      });
      if (!cls) {
        return res.status(404).json({ error: 'Matéria/Turma não encontrada' });
      }

      // Verificar matrícula existente
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          student_id_class_id: {
            student_id,
            class_id
          }
        }
      });

      if (existingEnrollment) {
        return res.status(400).json({ error: 'Aluno já matriculado nesta matéria' });
      }

      const enrollment = await prisma.enrollment.create({
        data: {
          student_id,
          class_id
        }
      });

      return res.status(201).json({
        message: 'Aluno matriculado com sucesso!',
        enrollment
      });
    } catch (error) {
      console.error('Erro enrollStudent', error);
      return res.status(500).json({ error: 'Erro ao matricular o aluno' });
    }
  }

  // 10. Alternar status ativo/inativo do aluno (Toggle Active / Trancamento)
  async toggleUserActiveStatus(req: AuthRequest, res: Response) {
    const userId = req.body.userId || req.body.studentId;
    const active = req.body.active;

    if (!userId || active === undefined) {
      return res.status(400).json({ error: 'ID do usuário e novo status (active) são obrigatórios' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { active: Boolean(active) }
      });

      const statusMsg = updatedUser.active ? 'ativada' : 'desativada/trancada';

      return res.json({
        message: `Conta de ${updatedUser.name} foi ${statusMsg} com sucesso!`,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          active: updatedUser.active
        }
      });
    } catch (error) {
      console.error('Erro toggleUserActiveStatus', error);
      return res.status(500).json({ error: 'Erro ao alterar status da conta do usuário' });
    }
  }

  // 11. Alternar status de conclusão de um curso do aluno (Concluído / Em Andamento)
  async toggleCourseCompletion(req: AuthRequest, res: Response) {
    const userId = req.body.userId || req.body.studentId;
    const course_name = req.body.course_name || req.body.courseName;
    const is_completed = req.body.is_completed !== undefined ? req.body.is_completed : req.body.isCompleted;

    if (!userId || !course_name || is_completed === undefined) {
      return res.status(400).json({ error: 'userId, course_name e is_completed são obrigatórios' });
    }

    try {
      const userCourse = await prisma.userCourse.upsert({
        where: {
          user_id_course_name: {
            user_id: userId,
            course_name: String(course_name),
          }
        },
        update: {
          is_completed: Boolean(is_completed)
        },
        create: {
          user_id: userId,
          course_name: String(course_name),
          is_completed: Boolean(is_completed)
        }
      });

      const statusText = userCourse.is_completed ? 'CONCLUÍDO (Somente Leitura)' : 'EM ANDAMENTO';

      return res.json({
        message: `Status do curso ${userCourse.course_name} atualizado para ${statusText}!`,
        userCourse
      });
    } catch (error) {
      console.error('Erro toggleCourseCompletion', error);
      return res.status(500).json({ error: 'Erro ao alterar status de conclusão do curso' });
    }
  }

  // 12. Obter lista de alunos em risco de reprovação por falta (< 75% de presença)
  async getStudentsAtRisk(req: AuthRequest, res: Response) {
    try {
      const enrollments = await prisma.enrollment.findMany({
        where: { class: { active: true } },
        include: {
          student: {
            include: { userCourses: true }
          },
          class: true
        }
      });

      const riskList: Array<any> = [];

      for (const enr of enrollments) {
        const student = enr.student;
        const cls = enr.class;

        const presences = await prisma.attendance.count({
          where: {
            student_id: student.id,
            class_id: cls.id,
            status: { in: ['PRESENTE', 'ATRASADO'] }
          }
        });

        const totalClasses = cls.total_classes || 40;
        const attendancePercentage = Math.round((presences / totalClasses) * 100);
        const absencePercentage = 100 - attendancePercentage;

        // Critério de risco: frequência < 75%
        if (attendancePercentage < 75) {
          const matchingCourse = student.userCourses?.find(uc => uc.course_name === cls.course_name);
          const semesterInfo = matchingCourse?.semester || student.student_semester || cls.semester;

          riskList.push({
            id: student.id,
            classId: cls.id,
            studentName: student.name,
            ra: student.ra || 'N/A',
            email: student.email,
            subject: cls.subject,
            course_name: cls.course_name || 'Geral',
            semester: semesterInfo,
            presences,
            totalClasses,
            attendancePercentage,
            absencePercentage,
            status: attendancePercentage < 60 ? 'Reprovado por Falta' : 'Em Risco'
          });
        }
      }

      // Ordenar por menor porcentagem de presença (maior risco) primeiro
      riskList.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

      return res.json(riskList);
    } catch (error) {
      console.error('Erro getStudentsAtRisk', error);
      return res.status(500).json({ error: 'Erro ao buscar alunos em risco de reprovação' });
    }
  }

  // 13. Identificador de Semestre Atual Automático (YYYY.1 ou YYYY.2)
  async getCurrentSemesterInfo(req: AuthRequest, res: Response) {
    try {
      const currentSemester = getCurrentAcademicSemester();
      const date = new Date();
      return res.json({
        currentSemester,
        year: date.getFullYear(),
        period: date.getMonth() + 1 <= 6 ? 1 : 2,
      });
    } catch (error) {
      console.error('Erro getCurrentSemesterInfo', error);
      return res.status(500).json({ error: 'Erro ao identificar semestre atual' });
    }
  }

  // 14. Ação de "Virada de Semestre" (Batch Increment)
  async batchAdvanceSemester(req: AuthRequest, res: Response) {
    try {
      // Buscar todos os alunos ativos da instituição
      const activeStudents = await prisma.user.findMany({
        where: { role: 'ALUNO', active: true },
        include: { userCourses: true }
      });

      let updatedStudentsCount = 0;
      let completedStudentsCount = 0;

      for (const student of activeStudents) {
        let hasUpdated = false;
        let lastNewSemester = student.student_semester;

        if (student.userCourses && student.userCourses.length > 0) {
          for (const uc of student.userCourses) {
            // Se o curso já não estava marcado como concluído, avança 1 semestre
            if (!uc.is_completed) {
              const { newSemester, isCompleted } = incrementStudentSemester(uc.semester);

              await prisma.userCourse.update({
                where: { id: uc.id },
                data: {
                  semester: newSemester,
                  is_completed: isCompleted,
                }
              });

              lastNewSemester = newSemester;
              hasUpdated = true;
              if (isCompleted) {
                completedStudentsCount++;
              }
            }
          }
        } else if (student.student_semester) {
          // Fallback se não tiver userCourses gravados
          const { newSemester } = incrementStudentSemester(student.student_semester);
          lastNewSemester = newSemester;
          hasUpdated = true;
        }

        if (hasUpdated) {
          await prisma.user.update({
            where: { id: student.id },
            data: { student_semester: lastNewSemester }
          });
          updatedStudentsCount++;
        }
      }

      const currentSemester = getCurrentAcademicSemester();

      return res.json({
        message: `Virada de semestre (${currentSemester}) concluída com sucesso!`,
        updatedStudentsCount,
        completedStudentsCount,
        currentSemester
      });
    } catch (error) {
      console.error('Erro batchAdvanceSemester', error);
      return res.status(500).json({ error: 'Erro ao realizar a virada de semestre' });
    }
  }

  // Cadastrar nova matéria/turma
  async createClass(req: AuthRequest, res: Response) {
    const { 
      subject, 
      course_name, 
      schedule_time, 
      week_days, 
      semester, 
      room_name, 
      latitude, 
      longitude, 
      radius_meters, 
      total_classes, 
      professor_id 
    } = req.body;

    if (!subject || !schedule_time || !professor_id) {
      return res.status(400).json({ error: 'Nome da matéria, horário e professor são obrigatórios' });
    }

    try {
      const professor = await prisma.user.findFirst({
        where: { id: professor_id, role: 'PROFESSOR' }
      });
      if (!professor) {
        return res.status(404).json({ error: 'Professor selecionado não foi encontrado' });
      }

      let lat = latitude ? parseFloat(String(latitude)) : -20.7588;
      let lon = longitude ? parseFloat(String(longitude)) : -42.8795;

      if (room_name) {
        const targetRoom = await prisma.room.findUnique({ where: { name: room_name } });
        if (targetRoom) {
          lat = targetRoom.latitude;
          lon = targetRoom.longitude;
        }
      }

      const newClass = await prisma.class.create({
        data: {
          subject,
          course_name: course_name || "Análise e Desenvolvimento de Sistemas",
          schedule_time,
          week_days: week_days || "segunda",
          semester: semester || "2026.1",
          room_name: room_name || "Sala Padrão",
          latitude: lat,
          longitude: lon,
          radius_meters: radius_meters ? parseInt(String(radius_meters), 10) : 50,
          total_classes: total_classes ? parseInt(String(total_classes), 10) : 40,
          professor_id,
          active: true
        }
      });

      return res.status(201).json({
        message: 'Matéria cadastrada com sucesso!',
        class: newClass
      });
    } catch (error) {
      console.error('Erro createClass', error);
      return res.status(500).json({ error: 'Erro ao cadastrar a matéria' });
    }
  }

  // Obter todas as salas cadastradas
  async getAllRooms(req: AuthRequest, res: Response) {
    try {
      const rooms = await prisma.room.findMany({
        orderBy: { name: 'asc' }
      });
      return res.json(rooms);
    } catch (error) {
      console.error('Erro getAllRooms', error);
      return res.status(500).json({ error: 'Erro ao buscar salas' });
    }
  }

  // Alternar status de conclusão de uma matéria/disciplina para um aluno
  async toggleSubjectCompletion(req: AuthRequest, res: Response) {
    const student_id = req.body.studentId || req.body.student_id;
    const class_id = req.body.classId || req.body.class_id;
    const is_completed = req.body.is_completed !== undefined ? req.body.is_completed : req.body.isCompleted;

    if (!student_id || !class_id || is_completed === undefined) {
      return res.status(400).json({ error: 'studentId, classId e is_completed são obrigatórios' });
    }

    try {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: String(student_id),
          class_id: String(class_id)
        }
      });

      if (!enrollment) {
        return res.status(404).json({ error: 'Matrícula do aluno nesta disciplina não foi encontrada.' });
      }

      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          is_completed: Boolean(is_completed)
        }
      });

      const statusText = updated.is_completed ? 'CONCLUÍDA' : 'EM ANDAMENTO';

      return res.json({
        message: `Status da matéria atualizado para ${statusText}!`,
        enrollment: updated
      });
    } catch (error) {
      console.error('Erro toggleSubjectCompletion', error);
      return res.status(500).json({ error: 'Erro ao alterar status de conclusão da matéria' });
    }
  }
}

