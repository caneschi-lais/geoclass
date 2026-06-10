import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import api from '../../services/api';
import { AttendanceLog } from '../../types';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import HistoryLogCard from '../../components/HistoryLogCard';
import EmptyState from '../../components/EmptyState';

export default function HistoryScreen() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get('/aluno/historico');
      setLogs(response.data);
    } catch (error) {
      console.log('Error loading history', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryLogCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message="Nenhum registro encontrado." />}
      />
    </View>
  );
}
