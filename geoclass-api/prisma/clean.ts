import prisma from '../src/prisma';

async function main() {
  console.log('🧹 Limpando dados do banco de dados (preservando a tabela Room)...');

  // Deletar na ordem reversa das dependências de chaves estrangeiras
  await prisma.attendance.deleteMany();
  console.log('✔ Tabela Attendance limpa.');

  await (prisma as any).classCancellation.deleteMany();
  console.log('✔ Tabela ClassCancellation limpa.');

  await prisma.temporaryClassLocation.deleteMany();
  console.log('✔ Tabela TemporaryClassLocation limpa.');

  await prisma.enrollment.deleteMany();
  console.log('✔ Tabela Enrollment limpa.');

  await prisma.notification.deleteMany();
  console.log('✔ Tabela Notification limpa.');

  await prisma.class.deleteMany();
  console.log('✔ Tabela Class limpa.');

  await prisma.userCourse.deleteMany();
  console.log('✔ Tabela UserCourse limpa.');

  await prisma.user.deleteMany();
  console.log('✔ Tabela User limpa.');

  await prisma.academicCalendar.deleteMany();
  console.log('✔ Tabela AcademicCalendar limpa.');

  await prisma.academicSemester.deleteMany();
  console.log('✔ Tabela AcademicSemester limpa.');

  const roomsCount = await prisma.room.count();
  console.log(`\n🎉 Limpeza concluída com sucesso!`);
  console.log(`📍 Tabela Room PRESERVADA com ${roomsCount} salas intactas no banco.`);
}

main()
  .catch((e) => {
    console.error('❌ Erro ao limpar o banco:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
