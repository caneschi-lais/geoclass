import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { deleteToken, getRole } from '../../services/authStorage';
import ScreenHeader from '../../components/ScreenHeader';
import api from '../../services/api';

type Props = {
  navigation: any;
  route: any;
};

export default function PrivacyScreen({ navigation, route }: Props) {
  const [loading, setLoading] = useState(false);
  const fromLogin = route?.params?.fromLogin;

  const handleLogout = async () => {
    await deleteToken();
    navigation.replace('Login');
  };

  const handleAcceptTerms = async () => {
    setLoading(true);
    try {
      await api.post('/accept-privacy-terms');
      const role = await getRole();
      if (role === 'PROFESSOR') {
        navigation.replace('ProfessorApp');
      } else if (role === 'COORDENADOR') {
        navigation.replace('CoordinatorApp');
      } else {
        navigation.replace('AlunoApp');
      }
    } catch (error: any) {
      console.error('Erro ao aceitar termos:', error);
      const message = error.response?.data?.error || 'Erro ao conectar com o servidor.';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      <ScreenHeader
        title="Privacidade"
        showBackButton={!fromLogin}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          icon: 'log-out',
          onPress: handleLogout,
          variant: 'danger'
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
          <View className="flex-row items-center mb-3">
            <Feather name="map-pin" size={24} color="#0ea5e9" className="mr-3" />
            <Text className="text-xl font-bold text-gray-800 dark:text-slate-100 ml-2">Uso da Localização</Text>
          </View>
          <Text className="text-justify text-gray-600 dark:text-slate-300 leading-relaxed mb-4">
            O GeoClass solicita acesso à sua localização
            <Text className="font-bold"> apenas durante o uso </Text>
            do aplicativo e estritamente no momento em que você clica em "Confirmar Presença".
          </Text>
          <Text className="text-justify text-gray-600 dark:text-slate-300 leading-relaxed">
            Nós usamos o GPS unicamente para calcular a distância entre você e a sala de aula. Não rastreamos seus movimentos em segundo plano nem fora do horário de aula.
          </Text>
        </View>

        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-6 shadow-sm border border-gray-100 dark:border-slate-700">
          <View className="flex-row items-center mb-3">
            <Feather name="trash-2" size={24} color="#10b981" className="mr-3" />
            <Text className="text-xl font-bold text-gray-800 dark:text-slate-100 ml-2">Exclusão de Dados</Text>
          </View>
          <Text className="text-justify text-gray-600 dark:text-slate-300 leading-relaxed mb-4">
            A sua privacidade é levada a sério. Por padrão, nosso servidor apaga periodicamente os registros brutos de coordenadas logo após o cálculo e a gravação oficial da sua presença no diário de classe.
          </Text>
          <Text className="text-justify text-gray-600 dark:text-slate-300 leading-relaxed">
            O identificador do seu dispositivo é salvo de forma criptografada apenas para evitar fraudes (várias presenças no mesmo aparelho).
          </Text>
        </View>
      </ScrollView>

      {fromLogin && (
        <View className="pb-8 pt-4 px-2">
          <TouchableOpacity
            className={`w-full rounded-xl p-4 items-center bg-sky-500 active:bg-sky-600 shadow-sm ${loading ? 'bg-sky-400' : 'bg-sky-500'}`}
            onPress={handleAcceptTerms}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-white font-bold text-lg">Aceitar e Continuar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

