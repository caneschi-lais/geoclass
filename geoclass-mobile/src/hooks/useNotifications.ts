import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { Notification } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get<Notification[]>('/notificacoes');
      if (isMounted.current) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id?: string) => {
    try {
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

  // Busca inicial e polling de 20 segundos para manter atualizado em tempo real
  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 20000);

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
