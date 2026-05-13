import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function lgpdWiperJob() {
  try {
    // Calcula a data de exatos 6 meses atrás
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Busca e atualiza todos os registros onde a data é menor que 6 meses atrás
    // e que ainda possuem as coordenadas salvas
    const result = await prisma.attendance.updateMany({
      where: {
        date: {
          lt: sixMonthsAgo,
        },
        OR: [
          { student_latitude: { not: null } },
          { student_longitude: { not: null } },
          { device_id: { not: null } }
        ]
      },
      data: {
        student_latitude: null,
        student_longitude: null,
        device_id: null,
      },
    });

    console.log(`[LGPD WIPER] Limpeza concluída. ${result.count} registros anonimizados.`);
  } catch (error) {
    console.error('[LGPD WIPER] Erro ao executar rotina de expurgo:', error);
  } finally {
    await prisma.$disconnect();
  }
}
