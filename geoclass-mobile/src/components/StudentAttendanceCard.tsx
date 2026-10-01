import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StudentAttendance } from '../types';

type Props = {
  item: StudentAttendance;
};

export default function StudentAttendanceCard({ item }: Props) {
  const semesterLabel = item.student_semester ? `${item.student_semester}º Semestre` : null;
  const courseLabel = item.courses && item.courses.length > 0 ? item.courses.join(', ') : null;

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border-l-4 border-l-emerald-500 border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-gray-700 flex-row justify-between items-center">
      <View className="flex-1 pr-2">
        <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
        <View className="flex-row flex-wrap items-center gap-2 mt-1">
          <Text className="text-gray-500 dark:text-slate-400 font-medium text-xs">RA: {item.ra}</Text>
          {semesterLabel && (
            <View className="bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 rounded">
              <Text className="text-sky-700 dark:text-sky-400 font-bold text-[10px]">{semesterLabel}</Text>
            </View>
          )}
        </View>
        {courseLabel && (
          <Text className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5" numberOfLines={1}>
            {courseLabel}
          </Text>
        )}
      </View>
      <View className="bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg flex-row items-center">
        <Feather name="clock" size={14} color="#10b981" />
        <Text className="text-emerald-600 font-bold ml-1">{item.time}</Text>
      </View>
    </View>
  );
}
