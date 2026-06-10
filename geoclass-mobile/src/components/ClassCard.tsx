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
    <View className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">{aula.subject}</Text>
          <Text className="text-gray-500 dark:text-slate-400 font-medium mt-1">{aula.professor} - {aula.room}</Text>
        </View>
        <View className="bg-sky-100 px-3 py-1 rounded-full">
          <Text className="text-sky-700 font-bold">{aula.time}</Text>
        </View>
      </View>

      {/* É necessário segurar o botão por 1 segundo para confirmar a presença */}
      <TouchableOpacity
        className={`mt-2 py-3 rounded-lg items-center flex-row justify-center ${isLoading ? 'bg-emerald-400' : 'bg-emerald-500'}`}
        onLongPress={() => onConfirm(aula)}
        delayLongPress={1000}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" className="mr-2" />
        ) : null}
        <Text className="text-white font-bold text-base">
          {isLoading ? 'Verificando...' : 'Segure para Confirmar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
