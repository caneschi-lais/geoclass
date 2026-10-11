import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AttendanceLog } from '../types';

type Props = {
  item: AttendanceLog;
};

export default function HistoryLogCard({ item }: Props) {
  const isFalta = item.status === 'FALTA';

  return (
    <View className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 shadow-sm border-l-4 ${
      isFalta ? 'border-l-red-500' : 'border-l-emerald-500'
    } border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-slate-700`}>
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-lg font-bold text-gray-800 dark:text-slate-100 flex-1 mr-2">{item.subject}</Text>
        <View className={`px-2.5 py-1 rounded-full flex-row items-center ${
          isFalta ? 'bg-red-100 dark:bg-red-950/40' : 'bg-emerald-100 dark:bg-emerald-950/40'
        }`}>
          <Feather
            name={isFalta ? 'x-circle' : 'check-circle'}
            size={12}
            color={isFalta ? '#ef4444' : '#10b981'}
          />
          <Text className={`font-bold text-xs ml-1 ${
            isFalta ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
          }`}>
            {isFalta ? 'Falta' : 'Presença'}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-start gap-4">
        <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg">
          <Feather name="calendar" size={16} color="#64748b" />
          <Text className="text-gray-600 dark:text-slate-300 font-medium ml-2">{item.date}</Text>
        </View>

        <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg">
          <Feather name="clock" size={16} color="#64748b" />
          <Text className="text-gray-600 dark:text-slate-300 font-medium ml-2">{item.time}</Text>
        </View>
      </View>
    </View>
  );
}
