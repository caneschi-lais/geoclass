import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Função utilitária: Fórmula de Haversine para calcular distância em metros
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Raio da terra em metros
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distância em metros
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export class AttendanceController {
  async registrarPresenca(req: AuthRequest, res: Response) {
    const studentId = req.user?.id;
    const { classId, lat, lon, deviceId } = req.body;

    if (!studentId || !classId || !lat || !lon) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
      // 1. Buscar informações da sala de aula
      const classData = await prisma.class.findUnique({
        where: { id: classId }
      });

      if (!classData) {
        return res.status(404).json({ error: 'Aula não encontrada' });
      }

      // 2. Verificar se o aluno está matriculado nesta turma
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          student_id_class_id: {
            student_id: studentId,
            class_id: classId
          }
        }
      });

      if (!enrollment) {
        return res.status(403).json({ error: 'Aluno não matriculado nesta turma' });
      }

      // 2.5 Verificar se a aula já foi registrada como EAD/Manual hoje pelo professor
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const manualAttendanceExists = await prisma.attendance.findFirst({
        where: {
          class_id: classId,
          date: today,
          manual_attendance: true
        }
      });

      if (manualAttendanceExists) {
        return res.status(403).json({ error: 'A chamada desta aula já foi controlada manualmente pelo professor hoje (Aula EAD).' });
      }

      // 3. Validação de Localização (Haversine)
      // Checa se há uma troca de sala para hoje
      const todayStr = new Date().toISOString().split('T')[0];
      const tempRoom = await prisma.temporaryClassLocation.findUnique({
        where: { class_id_date: { class_id: classId, date: todayStr } }
      });

      const targetLatitude = tempRoom ? tempRoom.latitude : classData.latitude;
      const targetLongitude = tempRoom ? tempRoom.longitude : classData.longitude;
      const targetRadius = classData.radius_meters;

      const distance = getDistanceFromLatLonInMeters(lat, lon, targetLatitude, targetLongitude);
      
      if (distance > targetRadius) {
        return res.status(400).json({ 
          error: `Você está fora da área permitida. Distância atual: ${Math.round(distance)}m. Máximo: ${targetRadius}m.` 
        });
      }

      // 4. Checagem de Fraude de Dispositivo (Opcional, verifica se o mesmo aparelho bateu ponto pra outro aluno hoje)
      if (deviceId) {
        const deviceUsedByOther = await prisma.attendance.findFirst({
          where: {
            device_id: deviceId,
            date: today,
            student_id: { not: studentId }
          }
        });

        if (deviceUsedByOther) {
          return res.status(403).json({ error: 'Este dispositivo já registrou presença para outro aluno hoje. Tentativa de fraude detectada.' });
        }
      }

      // 5. Registrar no Banco de Dados
      // A lat/lon do aluno é salva para a auditoria de 6 meses (LGPD), depois o Cron apagará
      const attendance = await prisma.attendance.create({
        data: {
          student_id: studentId,
          class_id: classId,
          date: today,
          check_in_time: new Date(),
          device_id: deviceId,
          status: 'PRESENTE', // Pode ser ajustado com lógica de horário (Atrasado)
          student_latitude: lat,
          student_longitude: lon
        }
      });

      return res.status(201).json({ message: 'Presença registrada com sucesso!', attendance });
    } catch (error: any) {
      console.error(error);
      
      // Tratamento para violação Unique constraint (tentou bater o ponto 2x no mesmo dia)
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Você já registrou presença nesta aula hoje.' });
      }

      return res.status(500).json({ error: 'Erro interno ao registrar presença.' });
    }
  }
}
