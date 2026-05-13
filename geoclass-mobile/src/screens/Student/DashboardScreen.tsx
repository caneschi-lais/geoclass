import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import api from '../../services/api';
import { DashboardStat } from '../../types';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import DashboardStatCard from '../../components/DashboardStatCard';
import EmptyState from '../../components/EmptyState';

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/aluno/dashboard');
      setStats(response.data);
    } catch (error) {
      console.log('Error loading dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 pt-14 px-4">
      {/* Cabeçalho com título e subtítulo */}
      <ScreenHeader
        title="Meu Desempenho"
        subtitle="Acompanhe sua frequência nas disciplinas."
      />

      {/* Cards com estatísticas de frequência */}
      <FlatList
        data={stats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <DashboardStatCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message="Nenhuma estatística encontrada." />}
      />
    </View>
  );
}
