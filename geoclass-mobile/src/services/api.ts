import axios from 'axios';
import { getToken } from './authStorage';

// URL de Produção no Render
const api = axios.create({
  baseURL: 'https://geoclass-backend.onrender.com/api',
  timeout: 30000, // 30 segundos (recomendado para acomodar o "spin down" do plano gratuito do Render)
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
