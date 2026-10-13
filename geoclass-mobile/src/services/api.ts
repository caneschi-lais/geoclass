import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getToken } from './authStorage';

// Determinar a URL da API (Local em desenvolvimento ou Render em produção)
const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (__DEV__) {
    if (Platform.OS === 'web') {
      return 'http://localhost:3000/api';
    }

    // No Expo Go, hostUri contém o IP da máquina na rede local (ex: 192.168.15.104:8081)
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;
    const hostIp = hostUri ? hostUri.split(':')[0] : null;

    if (hostIp) {
      return `http://${hostIp}:3000/api`;
    }

    if (Platform.OS === 'android') {
      if (!Device.isDevice) {
        return 'http://10.0.2.2:3000/api';
      }
      return 'http://192.168.15.104:3000/api';
    }
    return 'http://192.168.15.104:3000/api';
  }
  return 'https://geoclass-backend.onrender.com/api';
};

const API_BASE_URL = getBaseUrl();
console.log('🌐 [API BASE URL]:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 segundos
});

api.interceptors.request.use(
  async (config) => {
    // Busca o token do Secure Store de forma assíncrona
    const token = await getToken();

    // Se existir, injeta automaticamente no cabeçalho
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Lógica para deslogar usuário caso o token expire (401 Unauthorized)
    // Ignorar erros de credenciais inválidas na rota de login
    const isLoginRequest = error.config?.url?.endsWith('/login');
    if (error.response && error.response.status === 401 && !isLoginRequest) {
      console.log('Token expirado ou inválido. O usuário deve ser deslogado.');
      // O AppNavigator ou um contexto global lidaria com o redirecionamento aqui
    }
    return Promise.reject(error);
  }
);

export default api;
