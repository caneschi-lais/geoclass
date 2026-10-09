import axios from 'axios';
import { Platform } from 'react-native';
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
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }
  return 'https://geoclass-backend.onrender.com/api';
};

const API_BASE_URL = getBaseUrl();

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
