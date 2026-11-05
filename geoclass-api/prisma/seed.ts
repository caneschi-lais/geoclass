import bcrypt from 'bcryptjs';
import prisma from '../src/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌱 Iniciando o povoamento do Banco de Dados com os dados de teste (2026.2)...');

  // Senha padrão ("123456") para todos os usuários de teste
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Semestres Acadêmicos (Criar primeiro pois Class e UserCourse dependem de AcademicSemester)
  console.log('📅 Povoando Semestres Acadêmicos...');
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

  const semestersMap = new Map<string, any>();
  for (const s of semestersData) {
    const sem = await prisma.academicSemester.upsert({
      where: { name: s.name },
      update: {
        start_date: s.start_date,
        end_date: s.end_date,
        active: s.active,
      },
      create: s,
    });
    semestersMap.set(s.name, sem);
  }

  const currentSemester = semestersMap.get('2026.2');
  console.log(`✔ Semestre vigente ativo: ${currentSemester.name} (ID: ${currentSemester.id})`);

  // 2. Salas Físicas de Teste
  console.log('📍 Povoando Salas de Aula...');
  const defaultRoomsData = [
    { name: 'Sala 14', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 5', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 6', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Lab 7', latitude: -23.0856664, longitude: -47.2023632 },
    { name: 'Mini 1', latitude: -23.0856664, longitude: -47.2023632 },
  ];

  const roomsMap = new Map<string, any>();
  for (const r of defaultRoomsData) {
    const room = await prisma.room.upsert({
      where: { name: r.name },
      update: {
        latitude: r.latitude,
        longitude: r.longitude,
      },
      create: r,
    });
    roomsMap.set(r.name.trim().toLowerCase(), room);
  }
  console.log(`✔ ${roomsMap.size} salas configuradas.`);

  // 3. Cursos Oficiais
  console.log('🎓 Povoando Cursos da Instituição...');
  const coursesData = [
    { name: 'Análise e Desenvolvimento de Sistemas', code: 'ADS' },
    { name: 'Gestão Empresarial', code: 'GE' },
    { name: 'Comércio Exterior', code: 'COMEX' },
  ];

  const coursesMap = new Map<string, any>();
  for (const c of coursesData) {
    const course = await prisma.course.upsert({
      where: { name: c.name },
      update: { code: c.code },
      create: c,
    });
    coursesMap.set(c.name.trim().toLowerCase(), course);
  }
  console.log(`✔ ${coursesMap.size} cursos configurados.`);

  // 4. Usuários de Teste (Aluno, Professor e Coordenador)
  console.log('👤 Povoando Usuários de Teste...');
  const usersData = [
    {
      name: 'Aluno Teste',
      email: 'aluno@teste.com',
      role: 'ALUNO' as const,
      ra: '1050482413000',
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', term: '6º Semestre', is_completed: false },
        { course_name: 'Gestão Empresarial', term: '5º Semestre', is_completed: false },
        { course_name: 'Comércio Exterior', term: '7º Semestre', is_completed: true },
      ],
    },
    {
      name: 'Professor Teste',
      email: 'prof@teste.com',
      role: 'PROFESSOR' as const,
      ra: null,
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', term: null, is_completed: false },
        { course_name: 'Gestão Empresarial', term: null, is_completed: false },
        { course_name: 'Comércio Exterior', term: null, is_completed: false },
      ],
    },
    {
      name: 'Coordenador Teste',
      email: 'coord@teste.com',
      role: 'COORDENADOR' as const,
      ra: null,
      coursesDetails: [
        { course_name: 'Análise e Desenvolvimento de Sistemas', term: null, is_completed: false },
        { course_name: 'Gestão Empresarial', term: null, is_completed: false },
        { course_name: 'Comércio Exterior', term: null, is_completed: false },
      ],
    },
  ];

  const usersByEmail = new Map<string, any>();
  const studentsList: Array<any> = [];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        ra: u.ra || null,
        active: true,
      },
      create: {
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        role: u.role,
        ra: u.ra || null,
        active: true,
      },
    });

    // Vínculos em UserCourse
    for (const cd of u.coursesDetails) {
      const course = coursesMap.get(cd.course_name.trim().toLowerCase());
      if (course) {
        await prisma.userCourse.upsert({
          where: {
            user_id_course_id: {
              user_id: user.id,
              course_id: course.id,
            },
          },
          update: {
            student_term: cd.term,
            semester_id: currentSemester.id,
            is_completed: cd.is_completed ?? false,
          },
          create: {
            user_id: user.id,
            course_id: course.id,
            student_term: cd.term,
            semester_id: currentSemester.id,
            is_completed: cd.is_completed ?? false,
          },
        });
      }
    }

    usersByEmail.set(u.email.toLowerCase(), user);
    if (u.role === 'ALUNO') {
      studentsList.push({ ...user, coursesList: u.coursesDetails.map(c => c.course_name) });
    }
  }
  console.log(`✔ Usuários criados: Aluno (aluno@teste.com), Prof (prof@teste.com), Coord (coord@teste.com)`);

  // 5. Disciplinas do Semestre 2026.2
  console.log(`📚 Povoando Disciplinas de ADS no Semestre ${currentSemester.name}...`);
  const adsCourse = coursesMap.get('análise e desenvolvimento de sistemas');
  const profUser = usersByEmail.get('prof@teste.com');

  const classesData = [
    {
      subject: 'Gestão de equipes',
      schedule_time: '19:00, 19:50',
      week_days: 'segunda',
      room_name: 'Sala 14',
      total_classes: 34,
    },
    {
      subject: 'Empreendedorismo',
      schedule_time: '20:50, 21:40',
      week_days: 'segunda',
      room_name: 'Lab 5',
      total_classes: 34,
    },
    {
      subject: 'Laboratório de engenharia de software',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'terca,quarta',
      room_name: 'Lab 5',
      total_classes: 76,
    },
    {
      subject: 'Inglês 6',
      schedule_time: '20:50, 21:40',
      week_days: 'quarta',
      room_name: 'Mini 1',
      total_classes: 38,
    },
    {
      subject: 'Ética',
      schedule_time: '19:00, 19:50',
      week_days: 'quarta',
      room_name: 'Mini 1',
      total_classes: 38,
    },
    {
      subject: 'Redes de computadores',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'quinta',
      room_name: 'Lab 7',
      total_classes: 72,
    },
    {
      subject: 'Auditoria de sistemas',
      schedule_time: '19:00, 19:50, 20:50, 21:40',
      week_days: 'sexta',
      room_name: 'Lab 7',
      total_classes: 64,
    },
    {
      subject: 'Tópicos especificos de informática',
      schedule_time: '09:30, 10:20, 11:20, 12:10',
      week_days: 'sabado',
      room_name: 'Lab 6',
      total_classes: 64,
    },
  ];

  const createdClasses: any[] = [];

  for (const c of classesData) {
    const room = roomsMap.get(c.room_name.trim().toLowerCase()) || roomsMap.get('sala 14');

    const existingClass = await prisma.class.findFirst({
      where: {
        subject: c.subject,
        semester_id: currentSemester.id,
      },
    });

    let classRecord;
    if (existingClass) {
      classRecord = await prisma.class.update({
        where: { id: existingClass.id },
        data: {
          course_id: adsCourse.id,
          room_id: room.id,
          professor_id: profUser.id,
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          radius_meters: 15,
          total_classes: c.total_classes,
          active: true,
        },
      });
    } else {
      classRecord = await prisma.class.create({
        data: {
          subject: c.subject,
          course_id: adsCourse.id,
          semester_id: currentSemester.id,
          room_id: room.id,
          professor_id: profUser.id,
          schedule_time: c.schedule_time,
          week_days: c.week_days,
          radius_meters: 15,
          total_classes: c.total_classes,
          active: true,
        },
      });
    }

    createdClasses.push(classRecord);
  }
  console.log(`✔ ${createdClasses.length} turmas cadastradas para o semestre 2026.2.`);

  // 6. Matrícula do Aluno de Teste nas Disciplinas de ADS
  console.log('📝 Matriculando Aluno de Teste nas turmas...');
  const alunoUser = usersByEmail.get('aluno@teste.com');
  for (const cls of createdClasses) {
    await prisma.enrollment.upsert({
      where: {
        student_id_class_id: {
          student_id: alunoUser.id,
          class_id: cls.id,
        },
      },
      update: {},
      create: {
        student_id: alunoUser.id,
        class_id: cls.id,
      },
    });
  }
  console.log(`✔ Aluno matriculado com sucesso em todas as turmas.`);

  // 7. Calendário Acadêmico Oficial (Feriados, SPAP, Exames, Recessos)
  console.log('📅 Povoando Calendário de Dias Não-Letivos...');
  const calendarEvents = [
    { date: '2026-01-01', description: 'Confraternização Universal - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-02-04', description: '18ª SPAP - Semana Pedagógica', type: 'SPAP' },
    { date: '2026-02-14', description: 'Carnaval - Não haverá aula', type: 'FERIADO' },
    { date: '2026-02-16', description: 'Carnaval - Emenda', type: 'FERIADO' },
    { date: '2026-02-17', description: 'Carnaval - Feriado', type: 'FERIADO' },
    { date: '2026-02-18', description: 'Quarta-Feira de Cinzas', type: 'FERIADO' },
    { date: '2026-04-03', description: 'Paixão de Cristo - Feriado', type: 'FERIADO' },
    { date: '2026-04-21', description: 'Tiradentes - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-05-01', description: 'Dia do Trabalho - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-06-04', description: 'Corpus Christi - Feriado', type: 'FERIADO' },
    { date: '2026-07-09', description: 'Revolução Constitucionalista', type: 'FERIADO' },
    { date: '2026-09-07', description: 'Independência do Brasil - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-10-12', description: 'Nossa Senhora Aparecida - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-10-15', description: 'Dia do Professor - Feriado Escolar', type: 'FERIADO' },
    { date: '2026-11-02', description: 'Dia de Finados - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-11-15', description: 'Proclamação da República - Feriado Nacional', type: 'FERIADO' },
    { date: '2026-11-20', description: 'Dia da Consciência Negra - Feriado', type: 'FERIADO' },
    { date: '2026-12-25', description: 'Natal - Feriado Nacional', type: 'FERIADO' },
  ];

  for (const ev of calendarEvents) {
    const d = new Date(`${ev.date}T00:00:00.000Z`);
    await prisma.academicCalendar.upsert({
      where: { date: d },
      update: {
        description: ev.description,
        type: ev.type,
        semester_id: currentSemester.id,
      },
      create: {
        date: d,
        description: ev.description,
        type: ev.type,
        semester_id: currentSemester.id,
      },
    });
  }

  // 8. Gerar Atestado Médico Real de Demonstração pronto para teste
  console.log('🩺 Gerando solicitação de ausência com Atestado Médico oficial de teste...');
  const firstClass = createdClasses[0];
  const testDate = new Date();
  testDate.setUTCHours(0, 0, 0, 0);

  const uploadsDir = path.join(__dirname, '../uploads/atestados');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Exemplo de anexo probatório neutro (PNG 1x1 pixel)
  const certPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  const certFilename = `atestado-demo-seed.png`;
  const certPath = path.join(uploadsDir, certFilename);
  fs.writeFileSync(certPath, certPngBuffer);

  const certUrl = `/uploads/atestados/${certFilename}`;

  const existingCancellation = await prisma.classCancellation.findFirst({
    where: {
      class_id: firstClass.id,
      date: testDate,
    },
  });

  if (existingCancellation) {
    await prisma.classCancellation.update({
      where: { id: existingCancellation.id },
      data: {
        status: 'PENDENTE',
        reason_type: 'SAUDE',
        description: 'Consulta médica de rotina e sintomas gripais.',
        certificate_url: certUrl,
      },
    });
  } else {
    await prisma.classCancellation.create({
      data: {
        class_id: firstClass.id,
        course_id: adsCourse.id,
        professor_id: profUser.id,
        date: testDate,
        reason_type: 'SAUDE',
        description: 'Consulta médica de rotina e sintomas gripais.',
        status: 'PENDENTE',
        scope: 'TURMA',
        created_by_role: 'PROFESSOR',
        certificate_url: certUrl,
      },
    });
  }

  console.log('------------------------------------------------------------');
  console.log('🎉 BANCO DE DADOS POPULADO E PRONTO PARA TESTES!');
  console.log('------------------------------------------------------------');
  console.log('Credenciais para login:');
  console.log('  👨‍🎓 Aluno:       aluno@teste.com       / 123456 (RA: 1050482413000)');
  console.log('  👨‍🏫 Professor:   prof@teste.com        / 123456');
  console.log('  👔 Coordenador: coord@teste.com       / 123456');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
