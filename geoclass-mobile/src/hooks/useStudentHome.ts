import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import api from '../services/api';
import { ClassData } from '../types';

export function useStudentHome() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
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
      Alert.alert('Erro', 'Falha ao carregar os dados.');
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

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Acesso Negado',
          'A permissão de localização é estritamente necessária para confirmar que você está fisicamente na sala de aula. Habilite nas configurações.'
        );
        setProcessingId(null);
        return;
      }

      let lat, lon;
      if (Platform.OS === 'web') {
        lat = aula.latitude;
        lon = aula.longitude;
      } else {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      }

      const deviceId = await getUniqueDeviceId();

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

    } catch (error: any) {
      console.log('Erro ao registrar:', error);
      const msg = error.response?.data?.error || error.message || 'Erro desconhecido.';
      if (Platform.OS === 'web') {
        window.alert('Não foi possível registrar: ' + msg);
      } else {
        Alert.alert('Não foi possível registrar', msg);
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
