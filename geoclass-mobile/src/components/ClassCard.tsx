import React, { useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Animated } from 'react-native';
import { ClassData } from '../types';
import { Feather } from '@expo/vector-icons';

interface ClassCardProps {
  aula: ClassData;
  onConfirm: (aula: ClassData) => void;
  isLoading: boolean;
}

export default function ClassCard({ aula, onConfirm, isLoading }: ClassCardProps) {
  const progress = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (isLoading || aula.alreadyCheckedIn) return;

    // Inicia a animação de preenchimento
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500, // 1.5 segundos pressionado para confirmar
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onConfirm(aula);
      }
    });
  };

  const handlePressOut = () => {
    if (isLoading || aula.alreadyCheckedIn) return;

    // Se o usuário soltar antes de completar, reseta a barra rapidamente
    Animated.timing(progress, {
      toValue: 0,
      duration: 150, // Reseta em 150ms
      useNativeDriver: false,
    }).start();
  };

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">{aula.subject}</Text>
          <Text className="text-gray-500 dark:text-slate-400 font-medium mt-1">{aula.professor} - {aula.room}</Text>
        </View>
        <View className="bg-sky-100 dark:bg-sky-950/40 px-3 py-1 rounded-full">
          <Text className="text-sky-700 dark:text-sky-400 font-bold">{aula.time}</Text>
        </View>
      </View>

      {aula.alreadyCheckedIn ? (
        <View className="mt-2 py-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex-row justify-center items-center">
          <Feather name="check-circle" size={18} color="#10b981" />
          <Text className="text-emerald-700 dark:text-emerald-400 font-bold ml-2 text-sm">Presença Confirmada</Text>
        </View>
      ) : (
        /* Componente press-and-hold para evitar toques acidentais */
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isLoading}
          className={`mt-2 py-3.5 rounded-lg overflow-hidden flex-row justify-center items-center ${isLoading ? 'bg-emerald-400' : 'bg-emerald-500/80 active:bg-emerald-500'
            }`}
          style={({ pressed }) => [
            {
              elevation: pressed ? 1 : 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: pressed ? 0.5 : 1 },
              shadowOpacity: pressed ? 0.1 : 0.2,
              shadowRadius: pressed ? 1 : 1.5,
            }
          ]}
        >
          {!isLoading && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: '#059669',
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }}
            />
          )}

          <View className="flex-row justify-center items-center z-10">
            {isLoading ? (
              <ActivityIndicator color="#ffffff" className="mr-2" />
            ) : null}
            <Text className="text-white font-bold text-base">
              {isLoading ? 'Verificando...' : 'Registrar presença'}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
