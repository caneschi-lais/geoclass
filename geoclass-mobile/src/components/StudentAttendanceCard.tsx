import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StudentAttendance } from '../types';

type Props = {
  item: StudentAttendance;
};

export default function StudentAttendanceCard({ item }: Props) {
  const isFalta = item.status === 'FALTA';
  const isParcial = item.status === 'PRESENCA_PARCIAL';
  const semesterLabel = item.student_semester ? `${item.student_semester}º Semestre` : null;
  const courseLabel = item.courses && item.courses.length > 0 ? item.courses.join(', ') : null;

  let borderLeftColor = 'border-l-emerald-500';
  let badgeBg = 'bg-gray-50 dark:bg-slate-900';
  let badgeIcon = 'clock';
  let badgeIconColor = '#10b981';
  let badgeTextColor = 'text-emerald-600';
  let badgeLabel = item.time;

  if (isFalta) {
    borderLeftColor = 'border-l-red-500';
    badgeBg = 'bg-red-50 dark:bg-red-950/30';
    badgeIcon = 'x-circle';
    badgeIconColor = '#ef4444';
    badgeTextColor = 'text-red-600 dark:text-red-400';
    badgeLabel = 'Falta';
  } else if (isParcial) {
    borderLeftColor = 'border-l-amber-500';
    badgeBg = 'bg-amber-50 dark:bg-amber-950/30';
    badgeIcon = 'alert-circle';
    badgeIconColor = '#f59e0b';
    badgeTextColor = 'text-amber-700 dark:text-amber-400 font-bold';
    badgeLabel = 'Parcial';
  }

  return (
    <View className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border-l-4 ${borderLeftColor} border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-gray-700 flex-row justify-between items-center`}>
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
      <View className={`px-3 py-1.5 rounded-lg flex-row items-center ${badgeBg}`}>
        <Feather name={badgeIcon as any} size={14} color={badgeIconColor} />
        <Text className={`font-bold ml-1 text-xs ${badgeTextColor}`}>
          {badgeLabel}
        </Text>
      </View>
    </View>
  );
}
