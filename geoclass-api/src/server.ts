import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { lgpdWiperJob } from './jobs/LgpdWiperJob';
import router from './routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', router);

// Rota de Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'API Online', timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  
  // Iniciar Cron Job da LGPD
  // Expressão cron '0 3 * * *' = Roda todos os dias às 03:00 da manhã
  cron.schedule('0 3 * * *', () => {
    console.log('[CRON] Iniciando rotina de expurgo LGPD...');
    lgpdWiperJob();
  });
  console.log('⏰ Cron Job LGPD agendado para as 03:00 AM diariamente.');
});
