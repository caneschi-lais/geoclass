import React from 'react';
import { View, Text } from 'react-native';
import { DashboardStat } from '../types';

type Props = {
  item: DashboardStat;
};

export default function DashboardStatCard({ item }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aprovado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Reprovado': return 'bg-red-100 text-red-800 border-red-200';
      case 'Em Risco': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-emerald-600';
    if (percentage >= 60) return 'text-amber-500';
    return 'text-red-600';
  };

  return (
    <View className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100 flex-row justify-between items-center">
      <View className="flex-1 pr-4">
        <Text className="text-lg font-bold text-gray-800 mb-2">{item.subject}</Text>
        <View className={`self-start px-3 py-1 rounded-full border ${getStatusColor(item.status)}`}>
          <Text className="text-xs font-bold">{item.status}</Text>
        </View>
      </View>
      
      <View className="items-center justify-center bg-gray-50 rounded-full w-20 h-20 border-4 border-gray-100">
        <Text className={`text-xl font-black ${getPercentageColor(item.attendancePercentage)}`}>
          {item.attendancePercentage}%
        </Text>
      </View>
    </View>
  );
}
