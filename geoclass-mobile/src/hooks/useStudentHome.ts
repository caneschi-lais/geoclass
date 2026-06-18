import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import api from '../services/api';
import { ClassData } from '../types';
import { useOfflineQueue } from './useOfflineQueue';

const OFFLINE_SECRET = 'geoclass_offline_secret_key_2026';

function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export function useStudentHome() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const { enqueueOfflineAttendance, syncQueue } = useOfflineQueue();

  useEffect(() => {
    loadInitialData();
    syncQueue(); // Tenta sincronizar registros offline salvos ao abrir o app
  }, []);

  const loadInitialData = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos da sua localização (apenas durante o uso) exclusivamente para validar sua presença na sala de aula. Não faremos rastreamento contínuo.'
        );
      }

      const response = await api.get('/aluno/aulas/hoje');
      setClasses(response.data);
    } catch (error) {
      console.log('Error loading initial classes', error);
      Alert.alert('Aviso', 'Falha ao carregar aulas de hoje. Se estiver offline, você poderá registrar presenças nas aulas já carregadas.');
    } finally {
      setLoadingInitial(false);
    }
  };

  const getUniqueDeviceId = async () => {
    if (Platform.OS === 'web') {
      return 'web_browser_device';
    }

    let deviceId = '';
    if (Platform.OS === 'android') {
      deviceId = Application.getAndroidId();
    } else {
      deviceId = await Application.getIosIdForVendorAsync() || Device.osBuildId || 'unknown_ios';
    }
    return deviceId;
  };

  const handleConfirmAttendance = async (aula: ClassData) => {
    setProcessingId(aula.id);

    // 1. Obter GPS
    let lat: number, lon: number;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Acesso Negado',
          'A permissão de localização é estritamente necessária para confirmar que você está fisicamente na sala de aula.'
        );
        setProcessingId(null);
        return;
      }

      if (Platform.OS === 'web') {
        lat = aula.latitude;
        lon = aula.longitude;
      } else {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        lat = location.coords.latitude;
        lon = location.coords.longitude;

        if (location.mocked === true) {
          Alert.alert(
            'Tentativa de Fraude Detectada',
            'O uso de aplicativos de localização fictícia (Fake GPS) é estritamente proibido pelo regulamento acadêmico.'
          );
          setProcessingId(null);
          return;
        }
      }
    } catch (gpsError) {
      Alert.alert('Erro GPS', 'Não foi possível capturar a sua localização.');
      setProcessingId(null);
      return;
    }

    // 2. Obter ID de Dispositivo
    const deviceId = await getUniqueDeviceId();

    // 3. Tentar registrar online
    try {
      await api.post('/aluno/presenca', {
        classId: aula.id,
        lat,
        lon,
        deviceId
      });

      if (Platform.OS === 'web') {
        window.alert('Presença registrada com sucesso!');
      } else {
        Alert.alert('Sucesso', 'Presença registrada com sucesso!');
      }
      
      // Recarrega as aulas para atualizar o card de presença visualmente
      await loadInitialData();
    } catch (error: any) {
      const isNetworkError = !error.response;

      if (isNetworkError) {
        // Fallback: Modo Offline com validação de Geofencing local e assinatura criptográfica
        const distance = getDistanceFromLatLonInMeters(lat, lon, aula.latitude, aula.longitude);
        const radiusLimit = aula.radiusMeters || 50;

        if (distance > radiusLimit) {
          const msg = `Você está fora da área permitida. Distância: ${Math.round(distance)}m. Limite: ${radiusLimit}m.`;
          if (Platform.OS === 'web') {
            window.alert('Presença offline recusada: ' + msg);
          } else {
            Alert.alert('Fora da área permitida', msg);
          }
          setProcessingId(null);
          return;
        }

        // Gera o pacote assinado digitalmente
        const timestamp = new Date().toISOString();
        const payloadString = `${aula.id}${lat}${lon}${timestamp}${deviceId || ''}${OFFLINE_SECRET}`;
        
        try {
          const signature = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            payloadString
          );

          await enqueueOfflineAttendance({
            classId: aula.id,
            lat,
            lon,
            deviceId,
            timestamp,
            signature,
            subjectName: aula.subject
          });

          // Atualiza o estado local para marcar a presença como confirmada de imediato
          setClasses(prev => prev.map(c => c.id === aula.id ? { ...c, alreadyCheckedIn: true } : c));

          if (Platform.OS === 'web') {
            window.alert('Sem conexão de rede. Presença gravada offline com assinatura digital com sucesso!');
          } else {
            Alert.alert(
              'Registro Offline Salvo',
              'Detectamos que você está sem internet. Sua presença foi gravada offline de forma segura no aparelho e será sincronizada automaticamente assim que recuperar a conexão.'
            );
          }
        } catch (cryptoError) {
          Alert.alert('Erro de Assinatura', 'Não foi possível assinar os dados offline.');
        }
      } else {
        // Erro retornado pela API (Ex: 400, 403, Duplicado, Horário expirado)
        const msg = error.response?.data?.error || 'Erro desconhecido.';
        if (Platform.OS === 'web') {
          window.alert('Não foi possível registrar: ' + msg);
        } else {
          Alert.alert('Não foi possível registrar', msg);
        }
      }
    } finally {
      setProcessingId(null);
    }
  };

  return {
    classes,
    loadingInitial,
    processingId,
    loadInitialData,
    handleConfirmAttendance
  };
}
