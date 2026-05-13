import { ClassData, DashboardStat, AttendanceLog, StudentAttendance, CoordinatorAnalytics, StudentRisk } from '../types';

// Calcula a distância entre duas coordenadas usando a Fórmula de Haversine
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Raio da Terra em metros
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Simulando um banco de dados
const MOCK_CLASSES: ClassData[] = [
  {
    id: '1',
    subject: 'Matemática Aplicada',
    professor: 'Prof. Carlos',
    // Mockando para o horário atual pra não falhar por tempo sempre
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    latitude: -23.5505, // Coordenada da sala de aula (Ex: Praça da Sé)
    longitude: -46.6333,
    radiusMeters: 1000000000000000000, // Permite check-in num raio de 50m
  },
  {
    id: '2',
    subject: 'História da Computação',
    professor: 'Profa. Ana',
    time: '08:00', // Aula antiga (vai falhar por tempo)
    latitude: -23.5505,
    longitude: -46.6333,
    radiusMeters: 50,
  }
];

export const mockApi = {
  getAulasHoje: async (): Promise<ClassData[]> => {
    // Simula tempo de rede
    return new Promise(resolve => setTimeout(() => resolve(MOCK_CLASSES), 1000));
  },

  registrarPresenca: async (aulaId: string, lat: number, lon: number, deviceId: string) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const aula = MOCK_CLASSES.find(c => c.id === aulaId);
        if (!aula) {
          return reject(new Error('Aula não encontrada.'));
        }

        // 1. Validação de Distância
        const distance = getDistanceInMeters(lat, lon, aula.latitude, aula.longitude);
        if (distance > aula.radiusMeters) {
          // Se for uma aula mock e vc estiver testando em casa, provavelmente vai falhar de verdade
          // Por isso os "Mocks" são legais para testar a real lógica.
          return reject(new Error(`Fora do raio permitido. Você está a ${Math.round(distance)}m da sala de aula (Máx: ${aula.radiusMeters}m).`));
        }

        // 2. Validação de Tempo (> 15 min de atraso)
        const [classHour, classMin] = aula.time.split(':').map(Number);
        const classDate = new Date();
        classDate.setHours(classHour, classMin, 0, 0);

        const now = new Date();
        const diffMs = now.getTime() - classDate.getTime();
        const diffMins = Math.floor(diffMs / 1000 / 60);

        if (diffMins > 15) {
          return reject(new Error(`Atraso não permitido. Você chegou ${diffMins} minutos atrasado (Tolerância: 15 min).`));
        }

        if (diffMins < -60) {
          return reject(new Error('Muito cedo para registrar presença nesta aula.'));
        }

        // Sucesso
        console.log(`Presença registrada com sucesso usando Device ID: ${deviceId}`);
        resolve({ success: true, message: 'Presença confirmada!' });
      }, 1500);
    });
  },

  getDashboard: async (alunoId: string): Promise<DashboardStat[]> => {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: '1', subject: 'Matemática Aplicada', attendancePercentage: 85, status: 'Aprovado' },
      { id: '2', subject: 'História da Computação', attendancePercentage: 70, status: 'Em Risco' },
      { id: '3', subject: 'Física I', attendancePercentage: 50, status: 'Reprovado' },
    ]), 1000));
  },

  getHistorico: async (alunoId: string): Promise<AttendanceLog[]> => {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: 'h1', date: '27/04/2026', time: '08:00', subject: 'Matemática Aplicada' },
      { id: 'h2', date: '26/04/2026', time: '10:00', subject: 'História da Computação' },
      { id: 'h3', date: '25/04/2026', time: '08:00', subject: 'Matemática Aplicada' },
    ]), 1000));
  },

  getProfessorTurmas: async (professorId: string): Promise<ClassData[]> => {
    return new Promise(resolve => setTimeout(() => resolve(MOCK_CLASSES), 1000));
  },

  getTurmaPresencas: async (turmaId: string): Promise<StudentAttendance[]> => {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: '1', name: 'João Silva', ra: 'RA123456', time: '07:55' },
      { id: '2', name: 'Maria Souza', ra: 'RA654321', time: '08:02' },
      { id: '3', name: 'Pedro Santos', ra: 'RA112233', time: '08:14' },
    ]), 1000));
  },

  getCoordinatorAnalytics: async (): Promise<{ analytics: CoordinatorAnalytics, atRisk: StudentRisk[] }> => {
    return new Promise(resolve => setTimeout(() => resolve({
      analytics: {
        totalStudents: 1542,
        activeClasses: 48,
      },
      atRisk: [
        { id: '1', name: 'Carlos Ferreira', ra: 'RA998877', attendancePercentage: 68 },
        { id: '2', name: 'Ana Oliveira', ra: 'RA554433', attendancePercentage: 55 },
        { id: '3', name: 'Lucas Mendes', ra: 'RA223344', attendancePercentage: 72 },
      ]
    }), 1000));
  }
};
