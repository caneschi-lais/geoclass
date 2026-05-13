import axios from 'axios';
import { getToken } from './authStorage';

// ATENÇÃO: Substitua pelo seu IP da rede Wi-Fi! Ex: http://192.168.0.15:3000/api
// Se usar Emulador Android nativo sem Expo, pode usar http://10.0.2.2:3000/api
const api = axios.create({
  // baseURL: 'http://192.168.X.X:3000/api', 
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
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
    if (error.response && error.response.status === 401) {
      console.log('Token expirado ou inválido. O usuário deve ser deslogado.');
      // O AppNavigator ou um contexto global lidaria com o redirecionamento aqui
    }
    return Promise.reject(error);
  }
);

export default api;
