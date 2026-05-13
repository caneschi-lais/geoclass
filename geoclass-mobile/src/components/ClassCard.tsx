import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClassData } from '../types';

interface ClassCardProps {
  aula: ClassData;
  onConfirm: (aula: ClassData) => void;
  isLoading: boolean;
}

export default function ClassCard({ aula, onConfirm, isLoading }: ClassCardProps) {
  return (
    <View className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">{aula.subject}</Text>
          <Text className="text-gray-500 font-medium mt-1">{aula.professor} - {aula.room}</Text>
        </View>
        <View className="bg-sky-100 px-3 py-1 rounded-full">
          <Text className="text-sky-700 font-bold">{aula.time}</Text>
        </View>
      </View>

      <TouchableOpacity
        className={`mt-2 py-3 rounded-lg items-center flex-row justify-center ${isLoading ? 'bg-emerald-400' : 'bg-emerald-500'}`}
        onPress={() => onConfirm(aula)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" className="mr-2" />
        ) : null}
        <Text className="text-white font-bold text-base">
          {isLoading ? 'Verificando...' : 'Confirmar Presença'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
