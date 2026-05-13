import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { UserRole } from '../types';

const TOKEN_KEY = 'geoclass_jwt_token';
const ROLE_KEY = 'geoclass_user_role';

export async function saveToken(token: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    console.error('Erro ao salvar token:', error);
  }
}

export async function saveRole(role: UserRole) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(ROLE_KEY, role);
    } else {
      await SecureStore.setItemAsync(ROLE_KEY, role);
    }
  } catch (error) {
    console.error('Erro ao salvar role:', error);
  }
}

export async function getToken() {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Erro ao recuperar token:', error);
    return null;
  }
}

export async function getRole(): Promise<UserRole | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(ROLE_KEY) as UserRole | null;
    }
    const role = await SecureStore.getItemAsync(ROLE_KEY);
    return role as UserRole | null;
  } catch (error) {
    console.error('Erro ao recuperar role:', error);
    return null;
  }
}

export async function deleteToken() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ROLE_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(ROLE_KEY);
    }
  } catch (error) {
    console.error('Erro ao deletar dados de auth:', error);
  }
}
