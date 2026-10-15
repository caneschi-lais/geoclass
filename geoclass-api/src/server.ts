process.env.TZ = 'America/Sao_Paulo';

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { lgpdWiperJob } from './jobs/LgpdWiperJob';
import { notificationJob } from './jobs/NotificationJob';
import router from './routes';

import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Garantir que a pasta de uploads de atestados exista
const uploadsDir = path.join(__dirname, '../uploads/atestados');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api', router);

// Rota de Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'API Online', timestamp: new Date() });
});

import prisma from './prisma';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  // Sincronizar matérias criadas com semestre 2026.1 para 2026.2 (Semestre Vigente)
  prisma.academicSemester.findFirst({ where: { name: '2026.2' } }).then(sem2 => {
    if (sem2) {
      prisma.academicSemester.findFirst({ where: { name: '2026.1' } }).then(sem1 => {
        if (sem1) {
          prisma.class.updateMany({
            where: { semester_id: sem1.id },
            data: { semester_id: sem2.id }
          }).then(res => {
            if (res.count > 0) {
              console.log(`[SYNC] ${res.count} matéria(s) com semestre 2026.1 foram migradas para 2026.2.`);
            }
          }).catch(() => {});
        }
      });
    }
  }).catch(() => {});
  
  // Iniciar Cron Job da LGPD
  // Expressão cron '0 3 * * *' = Roda todos os dias às 03:00 da manhã
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[CRON] Iniciando rotina de expurgo LGPD...');
      await lgpdWiperJob();
    } catch (err) {
      console.error('[CRON] Erro ao executar expurgo LGPD:', err);
    }
  });
  console.log('⏰ Cron Job LGPD agendado para as 03:00 AM diariamente.');

  // Iniciar Cron Job de Notificações
  // Expressão cron '* * * * *' = Roda a cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      await notificationJob();
    } catch (err) {
      console.error('[CRON] Erro ao processar notificações:', err);
    }
  });
  console.log('⏰ Cron Job de Notificações agendado para rodar a cada minuto.');
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Exceção não tratada capturada:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[SERVER] Rejeição de Promise não capturada:', reason);
});
