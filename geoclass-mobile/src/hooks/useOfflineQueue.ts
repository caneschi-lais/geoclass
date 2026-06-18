import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const OFFLINE_QUEUE_KEY = '@geoclass_offline_attendance_queue';

export interface OfflineAttendanceItem {
  classId: string;
  lat: number;
  lon: number;
  deviceId: string;
  timestamp: string;
  signature: string;
  subjectName: string;
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineAttendanceItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const stored = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Error loading offline queue', error);
    }
  };

  const saveQueue = async (newQueue: OfflineAttendanceItem[]) => {
    try {
      await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.log('Error saving offline queue', error);
    }
  };

  const enqueueOfflineAttendance = async (item: OfflineAttendanceItem) => {
    const stored = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    const currentQueue: OfflineAttendanceItem[] = stored ? JSON.parse(stored) : [];
    
    // Evita duplicados na fila offline para a mesma aula
    const exists = currentQueue.some(q => q.classId === item.classId);
    if (exists) return;

    const newQueue = [...currentQueue, item];
    await saveQueue(newQueue);
  };

  const syncQueue = async () => {
    if (isSyncing) return;
    
    const stored = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    const currentQueue: OfflineAttendanceItem[] = stored ? JSON.parse(stored) : [];
    
    if (currentQueue.length === 0) return;

    setIsSyncing(true);
    const remainingQueue: OfflineAttendanceItem[] = [];

    for (const item of currentQueue) {
      try {
        await api.post('/aluno/presenca', {
          classId: item.classId,
          lat: item.lat,
          lon: item.lon,
          deviceId: item.deviceId,
          timestamp: item.timestamp,
          signature: item.signature
        });
        
        // Se deu sucesso, não adiciona no remainingQueue (é removido da fila)
        console.log(`[Offline Sync] Presença offline sincronizada com sucesso para ${item.subjectName}`);
      } catch (error: any) {
        console.log(`[Offline Sync] Falha ao sincronizar presença para ${item.subjectName}:`, error);
        
        const isNetworkError = !error.response; // Sem resposta do servidor indica problema de rede
        
        if (isNetworkError) {
          // Se for erro de rede, mantém na fila para tentar mais tarde
          remainingQueue.push(item);
        } else {
          // Se for erro de validação (ex: 400 ou 403), removemos da fila para não travar
          console.log(`[Offline Sync] Removendo registro inválido da fila: ${error.response?.data?.error}`);
        }
      }
    }

    await saveQueue(remainingQueue);
    setIsSyncing(false);
  };

  return {
    queue,
    isSyncing,
    enqueueOfflineAttendance,
    syncQueue,
    loadQueue,
    queueLength: queue.length
  };
}
