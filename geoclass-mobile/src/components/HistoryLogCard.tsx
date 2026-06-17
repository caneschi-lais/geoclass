import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AttendanceLog } from '../types';

type Props = {
  item: AttendanceLog;
};

export default function HistoryLogCard({ item }: Props) {
  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4 shadow-sm border-l-4 border-l-sky-500 border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-slate-700">
      <Text className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-3">{item.subject}</Text>

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
