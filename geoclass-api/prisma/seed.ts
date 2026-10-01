import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o povoamento do Banco de Dados para os Testes Presenciais...');

  // Define senha padrão fácil ("123456") para todos os usuários de teste
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Criar Salas Físicas (Rooms)
  const roomsData = [
    { name: 'Sala 14', latitude: , longitude:  },
    { name: 'Lab 5', latitude: , longitude:  },
    { name: 'Mini 1', latitude: , longitude:  },
    { name: 'Lab 7', latitude: , longitude:  },
    { name: 'Lab 6', latitude: , longitude:  },
    { name: 'Auditório', latitude: , longitude:  },
  ];

  const roomsMap = new Map();
  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { name: r.name },
      update: { latitude: r.latitude, longitude: r.longitude },
      create: r,
    });
    roomsMap.set(r.name, room);
  }

  // 2. Criar Usuários (Professores, Coordenadores e Alunos)
  const usersData = [
    // Alunos (Podem estar em múltiplos cursos e ter semestres diferentes para cada curso)
    {
      name: 'Aluno Teste', email: 'aluno.teste@aluno.com', role: 'ALUNO' as const, ra: '00', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '3º Semestre', is_completed: false },
        { course_name: 'Gestão Empresarial', semester: '5º Semestre', is_completed: false },
        { course_name: 'Comércio Exterior', semester: '7º Semestre', is_completed: false },
        { course_name: 'Desenvolvimento de Software Multiplataforma', semester: '6º Semestre', is_completed: true },
      ]
    },
    { 
      name: 'Laís Student', email: 'lais.siqueira@aluno.com', role: 'ALUNO' as const, ra: '01', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '6º Semestre', is_completed: false}
      ] 
    },
    { 
      name: 'Lucas Student', email: 'lucas.oliveira@aluno.com', role: 'ALUNO' as const, ra: '02', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '6º Semestre' },
        { course_name: 'Comércio Exterior', semester: '2º Semestre' }
      ] 
    },
    { 
      name: 'Lucas Franca', email: 'lucas.franca@aluno.com', role: 'ALUNO' as const, ra: '03', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '6º Semestre', is_completed: false }
      ] 
    },
    { 
      name: 'Leonardo Trindade', email: 'leonardo.trindade@aluno.com', role: 'ALUNO' as const, ra: '04', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '4º Semestre', is_completed: false },
        { course_name: 'Gestão Empresarial', semester: '7º Semestre', is_completed: true }
      ] 
    },
    { 
      name: 'Pedro Trindade', email: 'pedro.trindade@aluno.com', role: 'ALUNO' as const, ra: '05', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '4º Semestre', is_completed: false },
        { course_name: 'Gestão Empresarial', semester: '1º Semestre', is_completed: false }
      ] 
    },
    { 
      name: 'João Pedro', email: 'joao.pedro@aluno.com', role: 'ALUNO' as const, ra: '06', 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '2º Semestre', is_completed: false }
      ] 
    },
    // Professores (podem lecionar em múltiplos cursos)
    { 
      name: 'Laís teacher', email: 'lais.siqueira@professor.com', role: 'PROFESSOR' as const, 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null },
        { course_name: 'Gestão Empresarial', semester: null }
      ] 
    },
    { 
      name: 'Lucas teacher', email: 'lucas.oliveira@professor.com', role: 'PROFESSOR' as const, 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null },
        { course_name: 'Comércio Exterior', semester: null }
      ] 
    },
    // Coordenadores
    { 
      name: 'Laís coord', email: 'lais.siqueira@coordenador.com', role: 'COORDENADOR' as const, 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null },
        { course_name: 'Gestão Empresarial', semester: null }
      ] 
    },
    { 
      name: 'Lucas coord', email: 'lucas.oliveira@coordenador.com', role: 'COORDENADOR' as const, 
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null },
        { course_name: 'Comércio Exterior', semester: null }
      ] 
    },
  ];

  const usersMap = new Map();
  const studentsList: Array<any> = [];

  for (const u of usersData) {
    const courseNamesList = u.coursesDetails.map(c => c.course_name);
    const mainSemester = u.coursesDetails[0]?.semester || null;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { 
        name: u.name, 
        role: u.role, 
        ra: u.ra || null, 
        courses: courseNamesList, 
        student_semester: mainSemester, 
        active: true 
      },
      create: {
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        role: u.role,
        ra: u.ra || null,
        courses: courseNamesList,
        student_semester: mainSemester,
        active: true,
      },
    });

    // Salva ou atualiza os cursos com semestres individuais e status de conclusão no UserCourse
    for (const cd of u.coursesDetails) {
      await prisma.userCourse.upsert({
        where: {
          user_id_course_name: {
            user_id: user.id,
            course_name: cd.course_name,
          }
        },
        update: { 
          semester: cd.semester, 
          is_completed: cd.is_completed ?? false 
        },
        create: {
          user_id: user.id,
          course_name: cd.course_name,
          semester: cd.semester,
          is_completed: cd.is_completed ?? false,
        }
      });
    }

    usersMap.set(u.name, user);
    if (u.role === 'ALUNO') {
      studentsList.push({ ...user, coursesList: courseNamesList });
    }
  }

  // 3. Criar Disciplinas / Turmas (Classes)
  const defaultRadius = 40;
  const semester = '2026.2';

  const classesData = [
    {
      subject: 'Gestão de equipes ADS',
      schedule_time: '19:00, 19:50',
      week_days: 'segunda',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Sala 14',
      professorName: 'Laís teacher',
      total_classes: 20,
    },
    {
      subject: 'Gestão de equipes GE',
      schedule_time: '19:00, 19:50',
      week_days: 'segunda',
      course_name: 'Gestão Empresarial',
      room_name: 'Sala 14',
      professorName: 'Laís teacher',
      total_classes: 20,
    },
    {
      subject: 'Empreendedorismo ADS',
      schedule_time: '20:50, 21:40',
      week_days: 'segunda',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 5',
      professorName: 'Laís teacher',
      total_classes: 20,
    },
    {
      subject: 'Empreendedorismo GE',
      schedule_time: '20:50, 21:40',
      week_days: 'segunda',
      course_name: 'Gestão Empresarial',
      room_name: 'Lab 5',
      professorName: 'Laís teacher',
      total_classes: 20,
    },
    {
      subject: 'Laboratório de engenharia de software',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'terca,quarta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 5',
      professorName: 'Lucas teacher',
      total_classes: 40,
    },
    {
      subject: 'Inglês 6 ADS',
      schedule_time: '20:50, 21:40',
      week_days: 'terca',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Inglês 6 COMEX',
      schedule_time: '20:50, 21:40',
      week_days: 'terca',
      course_name: 'Comércio Exterior',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Inglês 6 GE',
      schedule_time: '20:50, 21:40',
      week_days: 'terca',
      course_name: 'Gestão Empresarial',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Ética',
      schedule_time: '19:00, 19:50',
      week_days: 'quarta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Ética GE',
      schedule_time: '19:00, 19:50',
      week_days: 'quarta',
      course_name: 'Gestão Empresarial',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Ética COMEX',
      schedule_time: '19:00, 19:50',
      week_days: 'quarta',
      course_name: 'Comércio Exterior',
      room_name: 'Mini 1',
      professorName: 'Lucas teacher',
      total_classes: 20,
    },
    {
      subject: 'Redes de computadores',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'quinta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 7',
      professorName: 'Lucas teacher',
      total_classes: 40,
    },
    {
      subject: 'Auditoria de sistemas',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'sexta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 7',
      professorName: 'Laís teacher',
      total_classes: 40,
    },
    {
      subject: 'Tópicos especificos de informática',
      schedule_time: '09:30, 10:20, 11:20, 12:10',
      week_days: 'sabado',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 6',
      professorName: 'Laís teacher',
      total_classes: 40,
    },
  ];

  const createdClasses = [];

  for (const c of classesData) {
    const room = roomsMap.get(c.room_name);
    const professor = usersMap.get(c.professorName);

    if (!room || !professor) {
      console.warn(`⚠️ Sala ou professor não encontrado para ${c.subject}`);
      continue;
    }

    const existingClass = await prisma.class.findFirst({
      where: { subject: c.subject, semester },
    });

    let classRecord;
    if (existingClass) {
      classRecord = await prisma.class.update({
        where: { id: existingClass.id },
        data: {
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          room_name: c.room_name,
          latitude: room.latitude,
          longitude: room.longitude,
          radius_meters: defaultRadius,
          professor_id: professor.id,
          total_classes: c.total_classes,
        },
      });
    } else {
      classRecord = await prisma.class.create({
        data: {
          subject: c.subject,
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          room_name: c.room_name,
          latitude: room.latitude,
          longitude: room.longitude,
          radius_meters: defaultRadius,
          semester,
          professor_id: professor.id,
          total_classes: c.total_classes,
        },
      });
    }

    createdClasses.push(classRecord);
  }

  // 4. TRAVA DE CURSO: Matricular os Alunos APENAS nas Disciplinas dos seus Cursos
  for (const student of studentsList) {
    for (const classRec of createdClasses) {
      if (classRec.course_name && student.coursesList.includes(classRec.course_name)) {
        await prisma.enrollment.upsert({
          where: {
            student_id_class_id: {
              student_id: student.id,
              class_id: classRec.id,
            },
          },
          update: {},
          create: {
            student_id: student.id,
            class_id: classRec.id,
          },
        });
      }
    }
  }

  console.log('✅ Banco de dados populado com sucesso para os testes presenciais!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
