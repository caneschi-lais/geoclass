import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { saveToken, saveRole } from '../services/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { isDark } = useTheme();
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
    <View className="flex-1 justify-center items-center bg-slate-800 p-6">
      <View className="items-center justify-center mb-4">
        <View className="items-center justify-center mb-6">
          <Image className='rounded-2xl'
            source={isDark ? require('../../assets/images/dark-logo.png') : require('../../assets/images/logo.jpg')}
            style={{ width: 110, height: 110 }}
            resizeMode="contain"
          />
        </View>
      </View>

      <View className="flex-row items-center justify-center mb-8">
        <Text className="text-3xl font-extrabold text-[#0096c7]">Geo</Text>
        <Text className="text-3xl font-extrabold text-[#00b489]">Class</Text>
      </View>

      <View className="w-full max-w-sm mb-4">
        <Text className="text-slate-300 mb-2 font-medium">E-mail</Text>
        <TextInput
          className="w-full bg-slate-700 rounded-lg p-4 text-slate-100 border border-slate-600"
          placeholder="Digite seu e-mail"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View className="w-full max-w-sm mb-8">
        <Text className="text-slate-300 mb-2 font-medium">Senha</Text>
        <TextInput
          className="w-full bg-slate-700 rounded-lg p-4 text-slate-100 border border-slate-600"
          placeholder="Digite sua senha"
          placeholderTextColor="#94a3b8"
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