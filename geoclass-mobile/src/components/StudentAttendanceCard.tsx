import React from 'react';
import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StudentAttendance } from '../types';

type Props = {
  item: StudentAttendance;
};

export default function StudentAttendanceCard({ item }: Props) {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 border-l-emerald-500 border border-y-gray-100 border-r-gray-100 flex-row justify-between items-center">
      <View>
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Text className="text-gray-500 font-medium text-sm mt-1">RA: {item.ra}</Text>
      </View>
      <View className="bg-gray-50 px-3 py-1.5 rounded-lg flex-row items-center">
        <Feather name="clock" size={14} color="#10b981" />
        <Text className="text-emerald-600 font-bold ml-1">{item.time}</Text>
      </View>
    </View>
  );
}
