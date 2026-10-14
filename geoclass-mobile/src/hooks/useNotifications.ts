import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { Notification } from '../types';
import { getToken } from '../services/authStorage';
import {
  registerForPushNotificationsAsync,
  triggerLocalNotification,
} from '../services/pushNotificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);
  const seenIds = useRef<Set<string>>(new Set());
  const initialFetchDone = useRef(false);

  const fetchNotifications = useCallback(async (silent = false) => {
    const token = await getToken();
    if (!token) return;

    if (!silent) setLoading(true);
    try {
      const response = await api.get<Notification[]>('/notificacoes');
      const data = response.data || [];

      if (isMounted.current) {
        setNotifications(data);

        // Se for uma atualização subsequente (polling), verificar se há novas notificações não lidas
        if (initialFetchDone.current) {
          data.forEach((notif) => {
            if (!notif.read && !seenIds.current.has(notif.id)) {
              // Disparar popup / banner nativo fora ou no topo do app
              triggerLocalNotification(notif.title, notif.body, { id: notif.id });
              seenIds.current.add(notif.id);
            }
          });
        } else {
          // Na primeira busca, apenas registrar os IDs existentes
          data.forEach((notif) => seenIds.current.add(notif.id));
          initialFetchDone.current = true;
        }
      }
    } catch (error: any) {
      if (!silent) {
        console.log('Erro ao buscar notificações:', error?.message || error);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id?: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      await api.put('/notificacoes/ler', { id });

      // Atualiza o estado localmente sem precisar de uma nova requisição
      setNotifications((prev) =>
        prev.map((n) => {
          if (!id) {
            // Se nenhum ID for passado, marca todas como lidas
            return { ...n, read: true };
          }
          return n.id === id ? { ...n, read: true } : n;
        })
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  // Busca inicial, registro de push token e polling de 15 segundos para avisos em tempo real
  useEffect(() => {
    isMounted.current = true;

    // Registrar o aparelho para receber push notifications no celular
    registerForPushNotificationsAsync();

    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 15000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    refresh: fetchNotifications,
    markAsRead,
  };
}
