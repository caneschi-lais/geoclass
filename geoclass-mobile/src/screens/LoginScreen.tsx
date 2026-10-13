import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { saveToken, saveRole } from '../services/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

        if (!user.privacy_terms_accepted_at) {
          navigation.replace('Privacy', { fromLogin: true });
        } else {
          if (user.role === 'PROFESSOR') navigation.replace('ProfessorApp');
          else if (user.role === 'COORDENADOR') navigation.replace('CoordinatorApp');
          else navigation.replace('AlunoApp');
        }
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
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-slate-900"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: keyboardVisible ? 'flex-start' : 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingTop: keyboardVisible ? 28 : 36,
            paddingBottom: keyboardVisible ? 24 : 48,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="w-full items-center">
            {/* Theme Toggle no topo */}
            <View className={`w-full flex-row justify-end ${keyboardVisible ? 'mb-1' : 'mb-2'}`}>
              <ThemeToggle />
            </View>

            {/* Logo recolhe quando o teclado está aberto para subir os campos imediatamente */}
            {!keyboardVisible && (
              <View className="items-center justify-center mb-4 mt-2">
                <View className="items-center justify-center mb-4">
                  <Image
                    className="rounded-2xl"
                    source={isDark ? require('../../assets/images/dark-logo.png') : require('../../assets/images/logo.jpg')}
                    style={{ width: 100, height: 100 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            {/* Título GeoClass */}
            <View className={`flex-row items-center justify-center ${keyboardVisible ? 'mb-4 mt-1' : 'mb-6'}`}>
              <Text className={`${keyboardVisible ? 'text-2xl' : 'text-3xl'} font-extrabold text-[#0096c7]`}>Geo</Text>
              <Text className={`${keyboardVisible ? 'text-2xl' : 'text-3xl'} font-extrabold text-[#00b489]`}>Class</Text>
            </View>

            {/* Campo E-mail */}
            <View className={`w-full max-w-sm ${keyboardVisible ? 'mb-3' : 'mb-4'}`}>
              <Text className="text-gray-600 dark:text-slate-300 mb-1.5 font-medium">E-mail</Text>
              <TextInput
                className={`w-full bg-white dark:bg-slate-800 rounded-lg ${keyboardVisible ? 'p-3' : 'p-4'} text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700`}
                placeholder="Digite seu e-mail"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Campo Senha */}
            <View className={`w-full max-w-sm ${keyboardVisible ? 'mb-4' : 'mb-6'}`}>
              <Text className="text-gray-600 dark:text-slate-300 mb-1.5 font-medium">Senha</Text>
              <TextInput
                className={`w-full bg-white dark:bg-slate-800 rounded-lg ${keyboardVisible ? 'p-3' : 'p-4'} text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-700`}
                placeholder="Digite sua senha"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {/* Botão Entrar */}
            <TouchableOpacity
              className={`w-full max-w-sm rounded-lg ${keyboardVisible ? 'p-3.5' : 'p-4'} items-center ${loading ? 'bg-sky-400' : 'bg-sky-500'}`}
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
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}