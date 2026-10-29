import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { getCurrentAcademicSemester, incrementStudentSemester } from '../utils/academicSemester';
import { getBrazilMidnightDate, getBrazilDateString } from '../utils/dateUtils';
import prisma from '../prisma';

async function findSemesterByNameOrId(param?: string | number | null) {
  if (!param) return null;
  const str = String(param).trim();
  const num = Number(str);
  if (!isNaN(num)) {
    const byId = await prisma.academicSemester.findUnique({ where: { id: num } });
    if (byId) return byId;
  }
  return await prisma.academicSemester.findUnique({ where: { name: str } });
}

async function getCoordinatorCourseIds(userId?: number | null): Promise<number[]> {
  if (!userId) return [];
  const coordCourses = await prisma.userCourse.findMany({
    where: { user_id: userId },
    select: { course_id: true }
  });
  return coordCourses.map(uc => uc.course_id);
}

export class CoordinatorController {
  // 1. Obter semestres ativos e a média global de faltas
  async getSemesters(req: AuthRequest, res: Response) {
    try {
      const coordinatorCourseIds = await getCoordinatorCourseIds(req.user?.id);
      const courseFilter = coordinatorCourseIds.length > 0 ? { course_id: { in: coordinatorCourseIds } } : {};

      const allSemesters = await prisma.academicSemester.findMany({
        orderBy: { name: 'desc' }
      });

      const semestersList = await Promise.all(allSemesters.map(async (sem) => {
        // Buscar todas as matrículas deste semestre filtradas pelo curso do coordenador
        const enrollments = await prisma.enrollment.findMany({
          where: { class: { semester_id: sem.id, ...courseFilter, active: true } },
          include: { class: true }
        });

        if (enrollments.length === 0) {
          return { id: sem.name, name: sem.name, absencePercentage: 0, attendancePercentage: 100 };
        }

        let totalExpectedClasses = 0;
        let totalFaltas = 0;

        for (const enr of enrollments) {
          totalExpectedClasses += enr.class.total_classes;
          const faltas = await prisma.attendance.count({
            where: { class_id: enr.class_id, student_id: enr.student_id, status: 'FALTA' }
          });
          totalFaltas += faltas;
        }

        // Faltas reais registradas e percentual de presença invertido (100 - ausência)
        const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);

        return {
          id: sem.name,
          name: sem.name,
          absencePercentage,
          attendancePercentage
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
    const { id: semester } = req.params; // ex: 2026.1 ou 2026.2

    try {
      const coordinatorCourseIds = await getCoordinatorCourseIds(req.user?.id);
      const courseFilter = coordinatorCourseIds.length > 0 ? { course_id: { in: coordinatorCourseIds } } : {};

      const semRecord = await findSemesterByNameOrId(semester);
      const semesterFilter = semRecord ? { semester_id: semRecord.id } : {};

      // Buscar alunos com matrícula no semestre e turmas do curso do coordenador
      const students = await prisma.user.findMany({
        where: { 
          role: 'ALUNO',
          enrollments: {
            some: { class: { ...semesterFilter, ...courseFilter, active: true } }
          }
        },
        include: {
          userCourses: {
            include: { course: true }
          },
          enrollments: {
            where: { class: { ...semesterFilter, ...courseFilter, active: true } },
            include: { class: { include: { course: true } } }
          },
          attendances: {
            where: { class: { ...semesterFilter, ...courseFilter, active: true }, status: 'FALTA' }
          }
        }
      });

      const studentsData = students.map(student => {
        let totalExpectedClasses = 0;
        student.enrollments.forEach(enr => {
          totalExpectedClasses += enr.class.total_classes;
        });

        const totalFaltas = student.attendances.length;
        const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);

        const subjects = Array.from(new Set(student.enrollments.map(enr => enr.class.subject)));
        const classCourses = student.enrollments.map(enr => enr.class.course?.name).filter(Boolean) as string[];
        const userCourseNames = student.userCourses?.map(uc => uc.course.name) || [];
        const courses = Array.from(new Set([...userCourseNames, ...classCourses]));

        const formattedUserCourses = (student.userCourses && student.userCourses.length > 0)
          ? student.userCourses.map(uc => ({
              id: uc.id,
              user_id: uc.user_id,
              course_id: uc.course_id,
              course_name: uc.course?.name || 'Curso',
              semester: uc.student_term || null,
              is_completed: Boolean(uc.is_completed)
            }))
          : courses.map(cName => ({
              course_name: cName,
              semester: null,
              is_completed: false
            }));

        return {
          id: student.id,
          name: student.name,
          ra: student.ra || 'N/A',
          courses: courses.length > 0 ? courses : ['Análise e Desenvolvimento de Sistemas'],
          subjects,
          userCourses: formattedUserCourses,
          active: student.active !== false,
          absencePercentage,
          attendancePercentage
        };
      });

      // Ordenar por alunos com menor presença (maior risco acadêmico) primeiro
      studentsData.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

      return res.json(studentsData);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar alunos do semestre' });
    }
  }

  // 3. Obter matérias de um aluno em um semestre específico
  async getStudentSubjects(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const studentId = Number(id);
    const { semester } = req.query as { semester: string };

    if (!semester) {
      return res.status(400).json({ error: 'Parâmetro semester é obrigatório' });
    }

    try {
      const semRecord = await findSemesterByNameOrId(semester);
      const semesterFilter = semRecord ? { semester_id: semRecord.id } : {};

      const enrollments = await prisma.enrollment.findMany({
        where: { 
          student_id: studentId,
          class: { ...semesterFilter, active: true }
        },
        include: { class: { include: { room: true } } }
      });

      const subjectsData = await Promise.all(enrollments.map(async (enr) => {
        const faltas = await prisma.attendance.count({
          where: { student_id: studentId, class_id: enr.class_id, status: 'FALTA' }
        });

        const totalAulas = enr.class.total_classes;
        const absencePercentage = totalAulas === 0 ? 0 : Math.round((faltas / totalAulas) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);

        return {
          classId: enr.class.id,
          subject: enr.class.subject,
          room_name: enr.class.room ? enr.class.room.name : 'Sala Padrão',
          total_classes: totalAulas,
          absencePercentage,
          attendancePercentage,
          is_completed: enr.is_completed || false
        };
      }));

      // Ordenar por matérias com menor presença primeiro
      subjectsData.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

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
        const allSemesters = await prisma.academicSemester.findMany({ orderBy: { name: 'desc' } });
        const data = await Promise.all(allSemesters.map(async (sem) => {
          const enrollments = await prisma.enrollment.findMany({ where: { class: { semester_id: sem.id, active: true } }, include: { class: true } });
          
          let totalExpectedClasses = 0;
          let totalFaltas = 0;
          for (const enr of enrollments) {
            totalExpectedClasses += enr.class.total_classes;
            totalFaltas += await prisma.attendance.count({ where: { class_id: enr.class_id, student_id: enr.student_id, status: 'FALTA' } });
          }
          const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);
          const attendancePercentage = Math.max(0, 100 - absencePercentage);

          let details: any = null;
          if (includeDetails === 'true') {
             // Detalhamento de alunos do semestre
             const students = await prisma.user.findMany({
               where: { role: 'ALUNO', enrollments: { some: { class: { semester_id: sem.id, active: true } } } },
               include: {
                 enrollments: { where: { class: { semester_id: sem.id, active: true } }, include: { class: true } },
                 attendances: { where: { class: { semester_id: sem.id, active: true }, status: 'FALTA' } }
               }
             });
             details = students.map(student => {
               let sTotal = 0;
               student.enrollments.forEach(e => sTotal += e.class.total_classes);
               const sAbsence = sTotal === 0 ? 0 : Math.round((student.attendances.length / sTotal) * 100);
               const sAttendance = Math.max(0, 100 - sAbsence);
               return { id: student.id, name: student.name, ra: student.ra, absencePercentage: sAbsence, attendancePercentage: sAttendance };
             });
          }

          return { semester: sem.name, absencePercentage, attendancePercentage, details };
        }));
        return res.json(data);
      }

      if (level === 'students') {
        if (!semesterId) return res.status(400).json({ error: 'semesterId obrigatório' });
        
        const sem = await findSemesterByNameOrId(semesterId as string);
        const semesterFilter = sem ? { semester_id: sem.id } : {};

        const students = await prisma.user.findMany({
          where: { role: 'ALUNO', enrollments: { some: { class: { ...semesterFilter, active: true } } } },
          include: {
            enrollments: { where: { class: { ...semesterFilter, active: true } }, include: { class: { include: { room: true } } } },
            attendances: { where: { class: { ...semesterFilter, active: true }, status: 'FALTA' } }
          }
        });

        const data = await Promise.all(students.map(async student => {
          let totalExpectedClasses = 0;
          student.enrollments.forEach(enr => { totalExpectedClasses += enr.class.total_classes; });
          const totalFaltas = student.attendances.length;
          const absencePercentage = totalExpectedClasses === 0 ? 0 : Math.round((totalFaltas / totalExpectedClasses) * 100);
          const attendancePercentage = Math.max(0, 100 - absencePercentage);

          let details: any = null;
          if (includeDetails === 'true') {
            details = await Promise.all(student.enrollments.map(async (enr) => {
              const cFaltas = await prisma.attendance.count({ where: { student_id: student.id, class_id: enr.class_id, status: 'FALTA' } });
              const cTotal = enr.class.total_classes;
              const cAbsence = cTotal === 0 ? 0 : Math.round((cFaltas / cTotal) * 100);
              const cAttendance = Math.max(0, 100 - cAbsence);
              return { subject: enr.class.subject, room_name: enr.class.room ? enr.class.room.name : 'Sala Padrão', absencePercentage: cAbsence, attendancePercentage: cAttendance };
            }));
          }

          return { id: student.id, name: student.name, ra: student.ra, absencePercentage, attendancePercentage, details };
        }));
        return res.json(data);
      }

      return res.status(400).json({ error: 'Nível de relatório inválido' });
    } catch (error) {
      console.error('Erro getReportData', error);
      return res.status(500).json({ error: 'Erro interno ao gerar relatório' });
    }
  }

  // 5. Cadastrar ou Atualizar sala
  async createRoom(req: AuthRequest, res: Response) {
    const { name, latitude, longitude, assignClass, subject, schedule_time, professor_id, semester, course_name, week_days } = req.body;

    const trimmedName = String(name || '').trim();

    if (!trimmedName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Nome, latitude e longitude são obrigatórios' });
    }

    const parsedLat = parseFloat(String(latitude).replace(',', '.'));
    const parsedLon = parseFloat(String(longitude).replace(',', '.'));

    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      return res.status(400).json({ error: 'Coordenadas de latitude e longitude são inválidas.' });
    }

    try {
      const existingRoom = await prisma.room.findUnique({
        where: { name: trimmedName }
      });

      let room;
      if (existingRoom) {
        room = await prisma.room.update({
          where: { id: existingRoom.id },
          data: {
            latitude: parsedLat,
            longitude: parsedLon
          }
        });
      } else {
        room = await prisma.room.create({
          data: {
            name: trimmedName,
            latitude: parsedLat,
            longitude: parsedLon
          }
        });
      }

      let createdClass = null;
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

        const classSemester = semester ? String(semester).trim() : getCurrentAcademicSemester();
        let semRecord = await findSemesterByNameOrId(classSemester);
        if (!semRecord) {
          semRecord = await prisma.academicSemester.findFirst({ where: { active: true } });
        }
        if (!semRecord) {
          semRecord = await prisma.academicSemester.create({
            data: {
              name: classSemester,
              start_date: new Date('2026-08-03'),
              end_date: new Date('2026-12-14'),
              active: true
            }
          });
        }

        const courseNameClean = course_name ? String(course_name).trim() : "Análise e Desenvolvimento de Sistemas";
        let courseRecord = await prisma.course.findUnique({ where: { name: courseNameClean } });
        if (!courseRecord) {
          courseRecord = await prisma.course.create({ data: { name: courseNameClean } });
        }

        createdClass = await prisma.class.create({
          data: {
            subject: String(subject).trim(),
            schedule_time: String(schedule_time).trim(),
            week_days: week_days ? String(week_days).trim() : "segunda",
            professor_id,
            room_id: room.id,
            course_id: courseRecord.id,
            semester_id: semRecord.id,
            radius_meters: 15,
            total_classes: 40,
            active: true
          },
          include: { room: true, course: true, semester: true }
        });
      }

      return res.status(201).json({ 
        message: existingRoom ? 'Sala atualizada com sucesso!' : 'Sala cadastrada com sucesso!', 
        room,
        class: createdClass 
      });
    } catch (error: any) {
      console.error('Erro createRoom:', error);
      return res.status(500).json({ error: error.message || 'Erro ao salvar a sala no banco de dados' });
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

  // 6b. Obter todas as turmas ativas
  async getAllActiveClasses(req: AuthRequest, res: Response) {
    try {
      const coordinatorCourseIds = await getCoordinatorCourseIds(req.user?.id);
      const courseFilter = coordinatorCourseIds.length > 0 ? { course_id: { in: coordinatorCourseIds } } : {};

      const classes = await prisma.class.findMany({
        where: { ...courseFilter, active: true },
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
      console.error('Erro getAllActiveClasses', error);
      return res.status(500).json({ error: 'Erro ao buscar turmas ativas' });
    }
  }

  // 7. Obter todas as turmas (matérias e professores) de um semestre
  async getClassesBySemester(req: AuthRequest, res: Response) {
    const { id: semester } = req.params;

    try {
      const coordinatorCourseIds = await getCoordinatorCourseIds(req.user?.id);
      const courseFilter = coordinatorCourseIds.length > 0 ? { course_id: { in: coordinatorCourseIds } } : {};

      const sem = await findSemesterByNameOrId(semester);
      const semesterFilter = sem ? { semester_id: sem.id } : {};

      const classes = await prisma.class.findMany({
        where: {
          ...semesterFilter,
          ...courseFilter,
          active: true
        },
        include: {
          professor: {
            select: {
              name: true,
              email: true
            }
          },
          room: true,
          course: true,
          semester: true,
          enrollments: {
            select: {
              student_id: true
            }
          },
          attendances: {
            where: { status: 'FALTA' },
            select: { id: true }
          }
        },
        orderBy: { subject: 'asc' }
      });

      const mappedClasses = classes.map(c => {
        const studentCount = c.enrollments.length;
        const totalExpected = studentCount * c.total_classes;
        const totalFaltas = c.attendances.length;
        const absencePercentage = totalExpected === 0 ? 0 : Math.round((totalFaltas / totalExpected) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);

        return {
          ...c,
          room_name: c.room?.name || 'Sala Padrão',
          latitude: c.room?.latitude || 0,
          longitude: c.room?.longitude || 0,
          course_name: c.course?.name || null,
          semester: c.semester?.name || '2026.2',
          student_count: studentCount,
          total_faltas: totalFaltas,
          absencePercentage,
          attendancePercentage
        };
      });

      return res.json(mappedClasses);
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
          active: true,
          userCourses: {
            include: { course: true }
          },
          enrollments: {
            select: {
              class_id: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      const formatted = students.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        ra: s.ra,
        active: s.active,
        courses: s.userCourses.map(uc => uc.course.name),
        student_semester: s.userCourses.find(uc => uc.student_term)?.student_term || null,
        userCourses: s.userCourses.map(uc => ({
          id: uc.id,
          user_id: uc.user_id,
          course_id: uc.course_id,
          course_name: uc.course?.name || 'Curso',
          semester: uc.student_term || null,
          is_completed: Boolean(uc.is_completed)
        })),
        enrollments: s.enrollments
      }));

      return res.json(formatted);
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
    const userId = Number(req.body.userId || req.body.studentId);
    const course_name = req.body.course_name || req.body.courseName;
    const course_id = req.body.course_id ? Number(req.body.course_id) : undefined;
    const is_completed = req.body.is_completed !== undefined ? req.body.is_completed : req.body.isCompleted;

    if (!userId || (!course_name && !course_id) || is_completed === undefined) {
      return res.status(400).json({ error: 'userId, course_name e is_completed são obrigatórios' });
    }

    try {
      let targetCourse = course_id 
        ? await prisma.course.findUnique({ where: { id: course_id } })
        : await prisma.course.findUnique({ where: { name: String(course_name).trim() } });
      
      if (!targetCourse && course_name) {
        targetCourse = await prisma.course.create({ data: { name: String(course_name).trim() } });
      }

      if (!targetCourse) {
        return res.status(404).json({ error: 'Curso não encontrado' });
      }

      const userCourse = await prisma.userCourse.upsert({
        where: {
          user_id_course_id: {
            user_id: userId,
            course_id: targetCourse.id,
          }
        },
        update: {
          is_completed: Boolean(is_completed)
        },
        create: {
          user_id: userId,
          course_id: targetCourse.id,
          is_completed: Boolean(is_completed)
        },
        include: { course: true }
      });

      const statusText = userCourse.is_completed ? 'CONCLUÍDO (Somente Leitura)' : 'EM ANDAMENTO';

      return res.json({
        message: `Status do curso ${userCourse.course.name} atualizado para ${statusText}!`,
        userCourse: {
          ...userCourse,
          course_name: userCourse.course.name
        }
      });
    } catch (error) {
      console.error('Erro toggleCourseCompletion', error);
      return res.status(500).json({ error: 'Erro ao alterar status de conclusão do curso' });
    }
  }

  // 12. Obter lista de alunos em risco de reprovação por falta (< 75% de presença)
  async getStudentsAtRisk(req: AuthRequest, res: Response) {
    try {
      const coordinatorCourseIds = await getCoordinatorCourseIds(req.user?.id);
      const courseFilter = coordinatorCourseIds.length > 0 ? { course_id: { in: coordinatorCourseIds } } : {};

      const enrollments = await prisma.enrollment.findMany({
        where: { class: { ...courseFilter, active: true } },
        include: {
          student: {
            include: {
              userCourses: {
                include: { course: true }
              }
            }
          },
          class: {
            include: {
              room: true,
              course: true,
              semester: true
            }
          }
        }
      });

      const riskList: Array<any> = [];

      for (const enr of enrollments) {
        const student = enr.student;
        const cls = enr.class;

        const faltas = await prisma.attendance.count({
          where: {
            student_id: student.id,
            class_id: cls.id,
            status: 'FALTA'
          }
        });

        const totalClasses = cls.total_classes || 40;
        const absencePercentage = Math.round((faltas / totalClasses) * 100);
        const attendancePercentage = Math.max(0, 100 - absencePercentage);

        // Critério de risco: frequência < 75% (ou seja, faltas > 25%)
        if (attendancePercentage < 75) {
          const matchingCourse = student.userCourses?.find(uc => uc.course_id === cls.course_id);
          const semesterInfo = matchingCourse?.student_term || student.userCourses?.[0]?.student_term || cls.semester?.name || '2026.2';

          riskList.push({
            id: student.id,
            classId: cls.id,
            studentName: student.name,
            ra: student.ra || 'N/A',
            email: student.email,
            subject: cls.subject,
            room_name: cls.room?.name || 'Sala Padrão',
            course_name: cls.course?.name || 'Geral',
            semester: semesterInfo,
            presences: Math.max(0, totalClasses - faltas),
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
        if (student.userCourses && student.userCourses.length > 0) {
          for (const uc of student.userCourses) {
            // Se o curso já não estava marcado como concluído, avança 1 semestre
            if (!uc.is_completed) {
              const { newSemester, isCompleted } = incrementStudentSemester(uc.student_term);

              await prisma.userCourse.update({
                where: { id: uc.id },
                data: {
                  student_term: newSemester,
                  is_completed: isCompleted,
                }
              });

              if (isCompleted) {
                completedStudentsCount++;
              }
            }
          }
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

      let lat = latitude ? parseFloat(String(latitude).replace(',', '.')) : -20.7588;
      let lon = longitude ? parseFloat(String(longitude).replace(',', '.')) : -42.8795;

      const roomNameClean = room_name ? String(room_name).trim() : "Sala Padrão";
      let targetRoom = await prisma.room.findUnique({ where: { name: roomNameClean } });
      if (!targetRoom) {
        targetRoom = await prisma.room.create({
          data: {
            name: roomNameClean,
            latitude: lat,
            longitude: lon
          }
        });
      }

      const courseNameClean = course_name ? String(course_name).trim() : "Análise e Desenvolvimento de Sistemas";
      let targetCourse = await prisma.course.findUnique({ where: { name: courseNameClean } });
      if (!targetCourse) {
        targetCourse = await prisma.course.create({ data: { name: courseNameClean } });
      }

      const classSemesterStr = semester ? String(semester).trim() : getCurrentAcademicSemester();
      let targetSemester = await findSemesterByNameOrId(classSemesterStr);
      if (!targetSemester) {
        targetSemester = await prisma.academicSemester.findFirst({ where: { active: true } });
      }
      if (!targetSemester) {
        targetSemester = await prisma.academicSemester.create({
          data: {
            name: classSemesterStr,
            start_date: new Date('2026-08-03'),
            end_date: new Date('2026-12-14'),
            active: true
          }
        });
      }

      const newClass = await prisma.class.create({
        data: {
          subject,
          schedule_time,
          week_days: week_days || "segunda",
          room_id: targetRoom.id,
          course_id: targetCourse.id,
          semester_id: targetSemester.id,
          radius_meters: radius_meters ? parseInt(String(radius_meters), 10) : 15,
          total_classes: total_classes ? parseInt(String(total_classes), 10) : 40,
          professor_id,
          active: true
        },
        include: { room: true, course: true, semester: true }
      });

      return res.status(201).json({
        message: 'Matéria cadastrada com sucesso!',
        class: {
          ...newClass,
          room_name: newClass.room.name,
          latitude: newClass.room.latitude,
          longitude: newClass.room.longitude,
          course_name: newClass.course?.name || null,
          semester: newClass.semester.name
        }
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
          student_id: Number(student_id),
          class_id: Number(class_id)
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

  // --- Rotas de Gestão do Calendário Acadêmico ---
  async getAcademicCalendar(req: AuthRequest, res: Response) {
    try {
      const events = await prisma.academicCalendar.findMany({
        orderBy: { date: 'asc' },
      });

      const semesters = await prisma.academicSemester.findMany({
        orderBy: { start_date: 'asc' },
      });

      return res.json({
        events: events.map((e) => ({
          id: e.id,
          date: e.date.toISOString().split('T')[0],
          description: e.description,
          type: e.type,
        })),
        semesters: semesters.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.start_date.toISOString().split('T')[0],
          endDate: s.end_date.toISOString().split('T')[0],
          active: s.active,
        })),
      });
    } catch (error) {
      console.error('Erro getAcademicCalendar', error);
      return res.status(500).json({ error: 'Erro ao buscar calendário acadêmico' });
    }
  }

  async createAcademicCalendarEntry(req: AuthRequest, res: Response) {
    const { date, description, type } = req.body;

    if (!date || !description) {
      return res.status(400).json({ error: 'Data e descrição são obrigatórias' });
    }

    try {
      const parts = String(date).split('-');
      if (parts.length !== 3) {
        return res.status(400).json({ error: 'Data deve estar no formato YYYY-MM-DD' });
      }

      const targetDate = getBrazilMidnightDate(date);

      const matchedSemester = await prisma.academicSemester.findFirst({
        where: {
          start_date: { lte: targetDate },
          end_date: { gte: targetDate },
        }
      });

      const entry = await prisma.academicCalendar.upsert({
        where: { date: targetDate },
        update: {
          description,
          type: type || 'NAO_LETIVO',
          semester_id: matchedSemester?.id || null,
        },
        create: {
          date: targetDate,
          description,
          type: type || 'NAO_LETIVO',
          semester_id: matchedSemester?.id || null,
        },
      });

      return res.status(201).json({
        message: 'Dia não-letivo registrado no calendário acadêmico!',
        entry: {
          id: entry.id,
          date: getBrazilDateString(entry.date),
          description: entry.description,
          type: entry.type,
          semester_id: entry.semester_id
        },
      });
    } catch (error) {
      console.error('Erro createAcademicCalendarEntry', error);
      return res.status(500).json({ error: 'Erro ao salvar evento no calendário' });
    }
  }

  async deleteAcademicCalendarEntry(req: AuthRequest, res: Response) {
    const { id } = req.params;

    try {
      await prisma.academicCalendar.delete({
        where: { id: Number(id) },
      });

      return res.json({ message: 'Dia não-letivo removido do calendário com sucesso!' });
    } catch (error) {
      console.error('Erro deleteAcademicCalendarEntry', error);
      return res.status(500).json({ error: 'Erro ao remover evento do calendário' });
    }
  }

  // Obter todos os cursos cadastrados
  async getAllCourses(req: AuthRequest, res: Response) {
    try {
      const courses = await prisma.course.findMany({
        orderBy: { name: 'asc' }
      });
      return res.json(courses);
    } catch (error) {
      console.error('Erro getAllCourses', error);
      return res.status(500).json({ error: 'Erro ao buscar cursos' });
    }
  }
}

