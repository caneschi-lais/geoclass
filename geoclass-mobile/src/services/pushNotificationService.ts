import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';
import { getToken } from './authStorage';

// Configura o comportamento de exibição das notificações quando o app está aberto ou em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra o dispositivo (Android / iOS) para receber notificações Push externas
 * Envia o ExpoPushToken para o backend salvar no cadastro do usuário
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let pushToken: string | null = null;

  try {
    // No ambiente Web, solicita permissão para a Web Notifications API
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'default') {
          await window.Notification.requestPermission();
        }
      }
      return null;
    }

    // Configurar canal de notificações específico no Android para som e popup (heads-up)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('geoclass-alerts', {
        name: 'GeoClass Notificações & Alertas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0ea5e9',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });
    }

    // Push remoto requer dispositivo físico (não emulador)
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ [PUSH] Permissão de notificação negada pelo usuário.');
        return null;
      }

      // Obter o Expo Push Token
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        (Constants as any).easConfig?.projectId;

      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      pushToken = tokenResponse.data;
      console.log('📲 [PUSH TOKEN OBTIDO]:', pushToken);

      // Enviar o token para o backend salvar no perfil do usuário logado
      const userAuthToken = await getToken();
      if (userAuthToken && pushToken) {
        await api.post('/notificacoes/salvar-push-token', { token: pushToken });
        console.log('✅ [PUSH TOKEN REGISTRADO COM SUCESSO NO SERVIDOR]');
      }
    } else {
      console.log('ℹ️ [PUSH] Notificações push remotas requerem um dispositivo físico.');
    }
  } catch (error: any) {
    console.warn('⚠️ [PUSH ERROR]: Não foi possível obter ou registrar push token:', error?.message || error);
  }

  return pushToken;
}

/**
 * Dispara uma notificação popup local imediatamente no celular (Android / iOS)
 * Útil quando o app recebe novos avisos via polling ou eventos em tempo real
 */
export async function triggerLocalNotification(title: string, body: string, data: Record<string, any> = {}) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(title, {
          body,
          icon: '/assets/icon.png',
        });
      }
      return;
    }

    // No Android, associar ao canal criado
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: Platform.OS === 'android' ? ({ channelId: 'geoclass-alerts' } as any) : null,
    });
  } catch (error: any) {
    console.warn('⚠️ [LOCAL NOTIFICATION ERROR]:', error?.message || error);
  }
}
