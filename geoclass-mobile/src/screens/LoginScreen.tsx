import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { saveToken, saveRole } from '../services/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { UserRole } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/login', { email, password });

      const { token, user } = response.data;

      if (token && user?.role) {
        await saveToken(token);
        await saveRole(user.role);

        // Redireciona para o fluxo principal baseado no Role
        if (user.role === 'PROFESSOR') navigation.replace('ProfessorApp');
        else if (user.role === 'COORDENADOR') navigation.replace('CoordinatorApp');
        else navigation.replace('AlunoApp');
      } else {
        Alert.alert('Erro', 'Token ou perfil não retornado pelo servidor.');
      }
    } catch (error: any) {
      console.log('Erro de login:', error);
      const message = error.response?.data?.error || 'Falha ao conectar com o servidor. Verifique se a API está rodando.';
      Alert.alert('Erro de Autenticação', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-slate-800 p-6">
      <Image
        source={require('../../assets/images/logo.jpg')}
        className="w-24 h-24 mb-6"
        resizeMode="contain"
      />

      <Text className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-8">GeoClass</Text>

      <View className="w-full max-w-sm mb-4">
        <Text className="text-gray-600 dark:text-slate-300 mb-2 font-medium">E-mail</Text>
        <TextInput
          className="w-full bg-gray-100 rounded-lg p-4 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700"
          placeholder="Digite seu e-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View className="w-full max-w-sm mb-8">
        <Text className="text-gray-600 dark:text-slate-300 mb-2 font-medium">Senha</Text>
        <TextInput
          className="w-full bg-gray-100 rounded-lg p-4 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700"
          placeholder="Digite sua senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <TouchableOpacity
        className={`w-full max-w-sm rounded-lg p-4 items-center ${loading ? 'bg-sky-400' : 'bg-sky-500'}`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white font-bold text-lg">Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
