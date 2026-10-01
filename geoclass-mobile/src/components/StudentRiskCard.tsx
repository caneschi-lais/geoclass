import React from 'react';
import { View, Text } from 'react-native';
import { StudentRisk } from '../types';

type Props = {
  item: StudentRisk;
};

export default function StudentRiskCard({ item }: Props) {
  const percentage = item.attendancePercentage ?? 0;
  const isCritical = percentage < 75;

  return (
    <View className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border-l-4 ${isCritical ? 'border-l-red-500' : 'border-l-amber-500'} border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-slate-700 flex-row justify-between items-center`}>
      <View className="flex-1 pr-3">
        <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.studentName || item.name}</Text>
        <Text className="text-gray-500 dark:text-slate-400 font-medium text-xs mt-0.5">RA: {item.ra}</Text>
        {item.subject ? (
          <Text className="text-sky-600 dark:text-sky-400 font-semibold text-xs mt-1">
            Matéria: {item.subject}
          </Text>
        ) : null}
        {item.course_name ? (
          <Text className="text-slate-400 dark:text-slate-500 text-[11px]">
            Curso: {item.course_name} {item.semester ? `(${item.semester}º Sem.)` : ''}
          </Text>
        ) : null}
      </View>
      <View className={`px-3 py-2 rounded-lg items-center ${isCritical ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30'}`}>
        <Text className={`font-black text-lg ${isCritical ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
          {percentage}%
        </Text>
        <Text className={`text-[10px] font-bold uppercase ${isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {isCritical ? 'Risco Reprovação' : 'Atenção'}
        </Text>
      </View>
    </View>
  );
}
