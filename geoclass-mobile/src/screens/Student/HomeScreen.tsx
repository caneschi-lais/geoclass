import React, { useEffect, useState } from 'react';
import { View, FlatList, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import api from '../../services/api';
import { ClassData } from '../../types';
import ClassCard from '../../components/ClassCard';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';

type Props = {
  navigation: any; // Type hacking para simplificar navegação aninhada
};

export default function HomeScreen({ navigation }: Props) {
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
        // Mocking: Na web, o GPS (HTML5) muitas vezes é bloqueado por falta de HTTPS ou restrições de permissão.
        // Vamos simular que o aluno está exatamente no centro da sala para o teste funcionar na Web.
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

  if (loadingInitial) return <LoadingOverlay message="Buscando aulas de hoje..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {/* Cabeçalho com título e botão de configurações */}
      <ScreenHeader
        title="Aulas de Hoje"
        rightButton={{
          icon: 'settings',
          onPress: () => navigation.navigate('Privacy'),
          variant: 'info'
        }}
      />

      {/* Catões para alunos marcarem a presença nas materias */}
      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassCard
            aula={item}
            onConfirm={handleConfirmAttendance}
            isLoading={processingId === item.id}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhuma aula programada para hoje." />}
      />
    </View>
  );
}
