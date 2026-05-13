import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando o povoamento do Banco de Dados...');

  const passwordHash = await bcrypt.hash('123456', 10);

  // 0. Criar Salas Físicas (Rooms)
  const room1 = await prisma.room.upsert({
    where: { name: 'Auditório Principal' },
    update: {},
    create: {
      name: 'Auditório Principal',
      latitude: -23.5510,
      longitude: -46.6340
    }
  });

  const room2 = await prisma.room.upsert({
    where: { name: 'Laboratório de Informática 3' },
    update: {},
    create: {
      name: 'Laboratório de Informática 3',
      latitude: -23.5520,
      longitude: -46.6350
    }
  });

  const room3 = await prisma.room.upsert({
    where: { name: 'Sala 204 - Bloco C' },
    update: {},
    create: {
      name: 'Sala 204 - Bloco C',
      latitude: -23.5530,
      longitude: -46.6360
    }
  });

  // 1. Criar Professores
  const prof1 = await prisma.user.upsert({
    where: { email: 'prof@teste.com' },
    update: {},
    create: {
      name: 'Professor Carlos',
      email: 'prof@teste.com',
      password_hash: passwordHash,
      role: 'PROFESSOR'
    }
  });

  const prof2 = await prisma.user.upsert({
    where: { email: 'profa@teste.com' },
    update: {},
    create: {
      name: 'Professora Ana',
      email: 'profa@teste.com',
      password_hash: passwordHash,
      role: 'PROFESSOR'
    }
  });

  // 2. Criar Alunos
  const aluno1 = await prisma.user.upsert({
    where: { email: 'aluno@teste.com' },
    update: {},
    create: {
      name: 'João Silva (Aluno)',
      email: 'aluno@teste.com',
      password_hash: passwordHash,
      role: 'ALUNO',
      ra: '123456789'
    }
  });

  // 3. Criar Coordenador
  const coord = await prisma.user.upsert({
    where: { email: 'coord@teste.com' },
    update: {},
    create: {
      name: 'Coordenadora Márcia',
      email: 'coord@teste.com',
      password_hash: passwordHash,
      role: 'COORDENADOR'
    }
  });

  // 4. Criar Turmas
  const mathClass = await prisma.class.upsert({
    where: { id: 'class_math_id_123' }, // Forçando ID para facilitar
    update: {},
    create: {
      id: 'class_math_id_123',
      subject: 'Matemática Aplicada',
      professor_id: prof1.id,
      schedule_time: '08:00', // A lógica no app pode requerer a hora atual para testes
      latitude: -23.5505,
      longitude: -46.6333,
      radius_meters: 100000000, // Raio gigante para testes locais passarem
      semester: '2026.1',
      room_name: 'Sala 101 - Bloco A',
      total_classes: 40
    }
  });

  const historyClass = await prisma.class.upsert({
    where: { id: 'class_hist_id_123' },
    update: {},
    create: {
      id: 'class_hist_id_123',
      subject: 'História da Computação',
      professor_id: prof2.id,
      schedule_time: '19:00',
      latitude: -23.5505,
      longitude: -46.6333,
      radius_meters: 50,
      semester: '2026.1',
      room_name: 'Laboratório 2',
      total_classes: 20
    }
  });

  // 5. Matricular Aluno 1 nas turmas
  await prisma.enrollment.upsert({
    where: { student_id_class_id: { student_id: aluno1.id, class_id: mathClass.id } },
    update: {},
    create: { student_id: aluno1.id, class_id: mathClass.id }
  });

  await prisma.enrollment.upsert({
    where: { student_id_class_id: { student_id: aluno1.id, class_id: historyClass.id } },
    update: {},
    create: { student_id: aluno1.id, class_id: historyClass.id }
  });

  console.log('✅ Banco de dados populado com sucesso!');
  console.log('--------------------------------------------------');
  console.log('Use os seguintes emails para testar no App (Senha: 123456):');
  console.log('- Aluno: aluno@teste.com');
  console.log('- Professor: prof@teste.com');
  console.log('- Coordenador: coord@teste.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
