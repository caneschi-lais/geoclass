import React from 'react';
import { View, Text } from 'react-native';
import { StudentRisk } from '../types';

type Props = {
  item: StudentRisk;
};

export default function StudentRiskCard({ item }: Props) {
  return (
    <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border-l-4 border-l-red-500 border border-y-gray-100 border-r-gray-100 flex-row justify-between items-center">
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{item.name}</Text>
        <Text className="text-gray-500 font-medium text-sm mt-1">RA: {item.ra}</Text>
      </View>
      <View className="bg-red-50 px-3 py-2 rounded-lg items-center">
        <Text className="text-red-700 font-black text-lg">{item.attendancePercentage}%</Text>
        <Text className="text-red-600 text-xs font-bold">Freq.</Text>
      </View>
    </View>
  );
}
