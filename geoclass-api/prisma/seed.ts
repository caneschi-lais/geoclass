import bcrypt from 'bcryptjs';
import prisma from '../src/prisma';

async function main() {
  console.log('🌱 Iniciando o povoamento do Banco de Dados com os dados de teste (2026.2)...');

  // Senha padrão ("123456") para todos os usuários de teste
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Obter ou inicializar Salas Físicas de teste
  console.log('🔍 Consultando e configurando salas no banco...');
  const defaultRoomsData = [
    { name: 'Sala 14', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 5', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 6', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 7', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Mini 1', latitude: -23.0856664, longitude: -47.2023632 },
  ];

  for (const r of defaultRoomsData) {
    await prisma.room.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
  }

  const existingRooms = await prisma.room.findMany();
  console.log(`📍 Foram encontradas ${existingRooms.length} salas cadastradas no banco.`);

  const roomsMap = new Map<string, (typeof existingRooms)[0]>();
  for (const r of existingRooms) {
    roomsMap.set(r.name.trim().toLowerCase(), r);
  }

  // 2. Usuários de Teste (Apenas Aluno, Professor e Coordenador de Teste)
  const usersData = [
    // ALUNO DE TESTE
    {
      name: 'Aluno Teste',
      email: 'aluno@teste.com',
      role: 'ALUNO' as const,
      ra: '1050482413000',
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: '6º Semestre', is_completed: false },
        { course_name: 'Gestão Empresarial', semester: '5º Semestre', is_completed: false },
        { course_name: 'Comércio Exterior', semester: '7º Semestre', is_completed: true },
      ],
    },

    // PROFESSOR DE TESTE
    {
      name: 'Professor Teste',
      email: 'prof@teste.com',
      role: 'PROFESSOR' as const,
      ra: null,
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null, is_completed: false },
        { course_name: 'Gestão Empresarial', semester: null, is_completed: false },
        { course_name: 'Comércio Exterior', semester: null, is_completed: false },
      ],
    },

    // COORDENADOR DE TESTE
    {
      name: 'Coordenador Teste',
      email: 'coord@teste.com',
      role: 'COORDENADOR' as const,
      ra: null,
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', semester: null, is_completed: false },
        { course_name: 'Gestão Empresarial', semester: null, is_completed: false },
        { course_name: 'Comércio Exterior', semester: null, is_completed: false },
      ],
    },
  ];

  console.log('👤 Povoando usuários de teste e seus vínculos de cursos...');
  const usersByEmail = new Map<string, any>();
  const studentsList: Array<any> = [];

  for (const u of usersData) {
    const courseNamesList = u.coursesDetails.map((c) => c.course_name);
    const mainSemester = u.coursesDetails[0]?.semester || null;

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        ra: u.ra || null,
        courses: courseNamesList,
        student_semester: mainSemester,
        active: true,
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

    // Vínculos detalhados por curso na tabela UserCourse
    for (const cd of u.coursesDetails) {
      await prisma.userCourse.upsert({
        where: {
          user_id_course_name: {
            user_id: user.id,
            course_name: cd.course_name,
          },
        },
        update: {
          semester: cd.semester,
          is_completed: cd.is_completed ?? false,
        },
        create: {
          user_id: user.id,
          course_name: cd.course_name,
          semester: cd.semester,
          is_completed: cd.is_completed ?? false,
        },
      });
    }

    usersByEmail.set(u.email.toLowerCase(), user);
    if (u.role === 'ALUNO') {
      studentsList.push({ ...user, coursesList: courseNamesList });
    }
  }

  // 3. Disciplinas / Turmas (Classes) - Semestre 2026.2 vinculadas ao professor de teste
  // Cálculo de aulas com base no Calendário Letivo Oficial 2026.2 (Fatec Indaiatuba):
  const semester = '2026.2';
  const defaultRadius = 40;

  const classesData = [
    {
      subject: 'Gestão de equipes',
      schedule_time: '19:00, 19:50',
      week_days: 'segunda',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Sala 14',
      professorEmail: 'prof@teste.com',
      total_classes: 34,
    },
    {
      subject: 'Empreendedorismo',
      schedule_time: '20:50, 21:40',
      week_days: 'segunda',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 5',
      professorEmail: 'prof@teste.com',
      total_classes: 34,
    },
    {
      subject: 'Laboratório de engenharia de software',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'terca,quarta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 5',
      professorEmail: 'prof@teste.com',
      total_classes: 76,
    },
    {
      subject: 'Inglês 6',
      schedule_time: '20:50, 21:40',
      week_days: 'quarta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Mini 1',
      professorEmail: 'prof@teste.com',
      total_classes: 38,
    },
    {
      subject: 'Ética',
      schedule_time: '19:00, 19:50',
      week_days: 'quarta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Mini 1',
      professorEmail: 'prof@teste.com',
      total_classes: 38,
    },
    {
      subject: 'Redes de computadores',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'quinta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 7',
      professorEmail: 'prof@teste.com',
      total_classes: 72,
    },
    {
      subject: 'Auditoria de sistemas',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'sexta',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 7',
      professorEmail: 'prof@teste.com',
      total_classes: 64,
    },
    {
      subject: 'Tópicos especificos de informática',
      schedule_time: '09:30, 10:20, 11:20, 12:10',
      week_days: 'sabado',
      course_name: 'Análise e Desenvolvimento de Sistemas',
      room_name: 'Lab 6',
      professorEmail: 'prof@teste.com',
      total_classes: 64,
    },
  ];

  console.log(`📚 Povoando disciplinas do semestre ${semester}...`);
  const createdClasses = [];

  for (const c of classesData) {
    const room = roomsMap.get(c.room_name.trim().toLowerCase());
    const professor = usersByEmail.get(c.professorEmail.toLowerCase());

    if (!professor) {
      console.warn(`⚠️ Professor com e-mail ${c.professorEmail} não encontrado para a matéria ${c.subject}`);
      continue;
    }

    if (!room) {
      console.warn(`⚠️ Sala "${c.room_name}" não foi encontrada no banco! Utilizando coordenadas de contingência.`);
    }

    const latitude = room ? room.latitude : -23.0856664;
    const longitude = room ? room.longitude : -47.2023632;
    const roomName = room ? room.name : c.room_name;

    const existingClass = await prisma.class.findFirst({
      where: { subject: c.subject, semester },
    });

    let classRecord;
    if (existingClass) {
      classRecord = await prisma.class.update({
        where: { id: existingClass.id },
        data: {
          course_name: c.course_name,
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          room_name: roomName,
          latitude,
          longitude,
          radius_meters: defaultRadius,
          professor_id: professor.id,
          total_classes: c.total_classes,
          active: true,
        },
      });
    } else {
      classRecord = await prisma.class.create({
        data: {
          subject: c.subject,
          course_name: c.course_name,
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          room_name: roomName,
          latitude,
          longitude,
          radius_meters: defaultRadius,
          semester,
          professor_id: professor.id,
          total_classes: c.total_classes,
          active: true,
        },
      });
    }

    createdClasses.push(classRecord);
  }

  // 4. Matrícula dos Alunos de Teste nas Disciplinas do Curso
  console.log('📝 Matriculando alunos de teste nas disciplinas de seus cursos...');
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

  // 5. Calendário Acadêmico Oficial da Fatec 2026 (Semestres e Dias Não-Letivos)
  console.log('📅 Povoando Calendário Acadêmico Oficial Fatec 2026...');

  // 5.1 Períodos Oficiais dos Semestres Letivos de 2026 (2026.2 Ativo)
  const semestersData = [
    {
      name: '2026.1',
      start_date: new Date('2026-02-09T00:00:00.000Z'),
      end_date: new Date('2026-06-27T00:00:00.000Z'),
      active: false,
    },
    {
      name: '2026.2',
      start_date: new Date('2026-08-03T00:00:00.000Z'),
      end_date: new Date('2026-12-14T00:00:00.000Z'),
      active: true,
    },
  ];

  for (const s of semestersData) {
    await prisma.academicSemester.upsert({
      where: { name: s.name },
      update: {
        start_date: s.start_date,
        end_date: s.end_date,
        active: s.active,
      },
      create: s,
    });
  }

  // 5.2 Eventos, Feriados, SPAP, Exames e Recessos do Calendário Fatec 2026
  const calendarEvents = [
    // --- JANEIRO ---
    { date: '2026-01-01', description: 'Confraternização Universal - Feriado Nacional', type: 'FERIADO' },

    // --- FEVEREIRO ---
    { date: '2026-02-04', description: '18ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-02-05', description: '18ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-02-06', description: '18ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-02-07', description: '18ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-02-14', description: 'Carnaval - Não haverá aula', type: 'FERIADO' },
    { date: '2026-02-15', description: 'Carnaval - Domingo', type: 'FERIADO' },
    { date: '2026-02-16', description: 'Carnaval - Emenda', type: 'FERIADO' },
    { date: '2026-02-17', description: 'Carnaval - Feriado', type: 'FERIADO' },
    { date: '2026-02-18', description: 'Quarta-Feira de Cinzas - Não haverá aula', type: 'FERIADO' },

    // --- ABRIL ---
    { date: '2026-04-03', description: 'Paixão de Cristo - Feriado', type: 'FERIADO' },
    { date: '2026-04-04', description: 'Sábado de Aleluia - Emenda Paixão de Cristo', type: 'FERIADO' },
    { date: '2026-04-05', description: 'Páscoa', type: 'FERIADO' },
    { date: '2026-04-20', description: 'Emenda de Feriado - Tiradentes', type: 'FERIADO' },
    { date: '2026-04-21', description: 'Tiradentes - Feriado Nacional', type: 'FERIADO' },

    // --- MAIO ---
    { date: '2026-05-01', description: 'Dia do Trabalho - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-05-02', description: 'Emenda - Dia do Trabalho', type: 'FERIADO' },

    // --- JUNHO ---
    { date: '2026-06-04', description: 'Corpus Christi - Feriado', type: 'FERIADO' },
    { date: '2026-06-05', description: 'Corpus Christi - Emenda', type: 'FERIADO' },
    { date: '2026-06-06', description: 'Corpus Christi - Emenda', type: 'FERIADO' },

    // --- JULHO (Exames, Feriado, Recesso e 19ª SPAP) ---
    { date: '2026-07-06', description: 'Período de Exames Finais (Sem chamada regular)', type: 'EXAME' },
    { date: '2026-07-07', description: 'Período de Exames Finais (Sem chamada regular)', type: 'EXAME' },
    { date: '2026-07-08', description: 'Período de Exames Finais (Sem chamada regular)', type: 'EXAME' },
    { date: '2026-07-09', description: 'Revolução Constitucionalista - Feriado Estadual', type: 'FERIADO' },
    { date: '2026-07-10', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-11', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-13', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-14', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-15', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-16', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-17', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-18', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-20', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-21', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-22', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-23', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-24', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-25', description: 'Período de Recesso Escolar', type: 'RECESSO' },
    { date: '2026-07-27', description: '19ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-07-28', description: '19ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-07-29', description: '19ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-07-30', description: '19ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-07-31', description: '19ª SPAP - Semana Pedagógica', type: 'SPAP' },

    // --- SETEMBRO ---
    { date: '2026-09-07', description: 'Independência do Brasil - Feriado Nacional', type: 'FERIADO' },

    // --- OUTUBRO ---
    { date: '2026-10-02', description: 'Preparo da Faculdade para Eleição - 1º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-03', description: 'Preparo da Faculdade para Eleição - 1º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-04', description: 'Eleições Nacionais 2026 - 1º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-12', description: 'Dia de Nossa Senhora Aparecida - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-10-15', description: 'Dia do Professor - Não haverá aula', type: 'FERIADO' },
    { date: '2026-10-23', description: 'Preparo da Faculdade para Eleição - 2º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-24', description: 'Preparo da Faculdade para Eleição - 2º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-25', description: 'Eleições Nacionais 2026 - 2º Turno', type: 'NAO_LETIVO' },
    { date: '2026-10-28', description: 'Dia do Servidor Público', type: 'NAO_LETIVO' },

    // --- NOVEMBRO ---
    { date: '2026-11-02', description: 'Dia de Finados - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-11-15', description: 'Proclamação da República - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-11-20', description: 'Dia da Consciência Negra - Feriado', type: 'FERIADO' },
    { date: '2026-11-21', description: 'Emenda - Dia da Consciência Negra', type: 'FERIADO' },

    // --- DEZEMBRO (Exames Finais e Recesso) ---
    { date: '2026-12-22', description: 'Período de Exames Finais (Sem chamada regular)', type: 'EXAME' },
    { date: '2026-12-23', description: 'Período de Exames Finais (Sem chamada regular)', type: 'EXAME' },
    { date: '2026-12-24', description: 'Véspera de Natal - Recesso Escolar', type: 'RECESSO' },
    { date: '2026-12-25', description: 'Natal - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-12-26', description: 'Recesso Escolar de Fim de Ano', type: 'RECESSO' },
    { date: '2026-12-28', description: 'Recesso Escolar de Fim de Ano', type: 'RECESSO' },
    { date: '2026-12-29', description: 'Recesso Escolar de Fim de Ano', type: 'RECESSO' },
    { date: '2026-12-30', description: 'Recesso Escolar de Fim de Ano', type: 'RECESSO' },
    { date: '2026-12-31', description: 'Recesso Escolar de Fim de Ano', type: 'RECESSO' },
  ];

  for (const ev of calendarEvents) {
    const d = new Date(`${ev.date}T00:00:00.000Z`);
    await prisma.academicCalendar.upsert({
      where: { date: d },
      update: {
        description: ev.description,
        type: ev.type,
      },
      create: {
        date: d,
        description: ev.description,
        type: ev.type,
      },
    });
  }

  console.log('✅ Base de dados populada com sucesso com os dados de teste para o semestre 2026.2!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
