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
  Pressable,
  Keyboard,
  LayoutAnimation,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../services/api';
import { saveToken, saveRole } from '../services/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { registerForPushNotificationsAsync } from '../services/pushNotificationService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setErrorMessage(null);

    if (!email.trim() || !password) {
      const msg = 'Por favor, preencha todos os campos.';
      setErrorMessage(msg);
      if (Platform.OS !== 'web') {
        Alert.alert('Atenção', msg);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/login', { email: email.trim(), password });
      const { token, user } = response.data;

      if (token && user?.role) {
        await saveToken(token);
        await saveRole(user.role);

        // Registrar o token de push do aparelho no backend
        registerForPushNotificationsAsync().catch(() => {});

        if (!user.privacy_terms_accepted_at) {
          navigation.replace('Privacy', { fromLogin: true });
        } else {
          if (user.role === 'PROFESSOR') navigation.replace('ProfessorApp');
          else if (user.role === 'COORDENADOR') navigation.replace('CoordinatorApp');
          else navigation.replace('AlunoApp');
        }
      } else {
        const msg = 'Token ou perfil não retornado pelo servidor.';
        setErrorMessage(msg);
        if (Platform.OS !== 'web') {
          Alert.alert('Erro', msg);
        }
      }
    } catch (error: any) {
      console.log('Erro de login:', error);
      const message =
        error.response?.data?.error ||
        (error.response?.status === 401
          ? 'Usuário não cadastrado ou credenciais incorretas.'
          : 'Falha ao conectar com o servidor. Verifique se a API está rodando.');
      setErrorMessage(message);
      if (Platform.OS !== 'web') {
        Alert.alert('Erro de Autenticação', message);
      }
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
      <Pressable onPress={Keyboard.dismiss} accessible={false} style={{ flex: 1, width: '100%' }}>
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

            {/* Aviso de Erro de Credenciais / Validação */}
            {errorMessage ? (
              <View
                style={{
                  elevation: 2,
                  shadowColor: '#e11d48',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                }}
                className="w-full max-w-sm mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl flex-row items-center"
              >
                <View className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 items-center justify-center mr-3">
                  <Feather name="alert-triangle" size={16} color="#e11d48" />
                </View>
                <View className="flex-1">
                  <Text className="text-[11px] font-extrabold text-rose-800 dark:text-rose-200 uppercase tracking-wider">
                    Não foi possível entrar
                  </Text>
                  <Text className="text-xs text-rose-700 dark:text-rose-300 font-semibold leading-relaxed mt-0.5">
                    {errorMessage}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setErrorMessage(null)}
                  className="p-1 rounded-full active:bg-rose-200 dark:active:bg-rose-900/60 ml-1"
                >
                  <Feather name="x" size={16} color="#e11d48" />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Campo E-mail */}
            <View className={`w-full max-w-sm ${keyboardVisible ? 'mb-3' : 'mb-4'}`}>
              <Text className="text-gray-600 dark:text-slate-300 mb-1.5 font-medium">E-mail</Text>
              <TextInput
                className={`w-full bg-white dark:bg-slate-800 rounded-lg ${keyboardVisible ? 'p-3' : 'p-4'} text-gray-800 dark:text-slate-100 border ${
                  errorMessage ? 'border-rose-300 dark:border-rose-700' : 'border-gray-200 dark:border-slate-700'
                }`}
                placeholder="Digite seu e-mail"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>

            {/* Campo Senha */}
            <View className={`w-full max-w-sm ${keyboardVisible ? 'mb-4' : 'mb-6'}`}>
              <Text className="text-gray-600 dark:text-slate-300 mb-1.5 font-medium">Senha</Text>
              <TextInput
                className={`w-full bg-white dark:bg-slate-800 rounded-lg ${keyboardVisible ? 'p-3' : 'p-4'} text-gray-800 dark:text-slate-100 border ${
                  errorMessage ? 'border-rose-300 dark:border-rose-700' : 'border-gray-200 dark:border-slate-700'
                }`}
                placeholder="Digite sua senha"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
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
      </Pressable>
    </KeyboardAvoidingView>
  );
}