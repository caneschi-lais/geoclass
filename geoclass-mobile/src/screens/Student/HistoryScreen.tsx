import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import api from '../../services/api';
import { AttendanceLog } from '../../types';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import HistoryLogCard from '../../components/HistoryLogCard';
import EmptyState from '../../components/EmptyState';

// Converte strings de data/hora (ex: "14/10/2026", "20/10", "19:00") em timestamp numérico para ordenação
function parseLogDateTime(dateStr?: string, timeStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const trimmed = dateStr.trim();
  let day = 1;
  let month = 1;
  let year = new Date().getFullYear();

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map(Number);
    if (parts.length === 3) {
      day = parts[0];
      month = parts[1];
      year = parts[2];
    } else if (parts.length === 2) {
      day = parts[0];
      month = parts[1];
    }
  } else if (trimmed.includes('-')) {
    const parts = trimmed.split('-').map(Number);
    if (parts.length === 3) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
  }

  let hour = 0;
  let minute = 0;
  if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.trim().split(':').map(Number);
    hour = !isNaN(parts[0]) ? parts[0] : 0;
    minute = !isNaN(parts[1]) ? parts[1] : 0;
  }

  const d = new Date(year, month - 1, day, hour, minute);
  const time = d.getTime();
  return isNaN(time) ? 0 : time;
}

export default function HistoryScreen() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/aluno/historico');
      const data: AttendanceLog[] = Array.isArray(response.data) ? response.data : [];

      // Ordenar explicitamente do mais recente para o mais antigo:
      // 1. Data e horário mais recentes primeiro
      // 2. ID decrescente
      const sorted = [...data].sort((a, b) => {
        const timeA = parseLogDateTime(a.date, a.time);
        const timeB = parseLogDateTime(b.date, b.time);
        if (timeB !== timeA) return timeB - timeA;
        return String(b.id || '').localeCompare(String(a.id || ''), undefined, { numeric: true });
      });

      setLogs(sorted);
    } catch (error) {
      console.log('Error loading history', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadHistory(true);
  }, []);

  if (loading && !refreshing) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {/* Cabeçalho com título e subtítulo */}
      <ScreenHeader
        title="Histórico"
        subtitle="Registro das suas últimas presenças."
      />

      {/* Cards com histórico de presença do aluno */}
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <HistoryLogCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={<EmptyState message="Nenhum registro encontrado." />}
      />
    </View>
  );
}
