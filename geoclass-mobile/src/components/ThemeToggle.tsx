import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ThemeToggle: React.FC = () => {
  const { setTheme, isDark } = useTheme();

  return (
    <View className="flex-row items-center bg-gray-100 dark:bg-slate-900/60 p-0.5 rounded-full border border-gray-200/50 dark:border-slate-800/80">
      <TouchableOpacity
        onPress={() => setTheme('light')}
        className={`p-1 rounded-full ${!isDark ? 'bg-white shadow-sm' : 'bg-transparent'}`}
        activeOpacity={0.7}
      >
        <Ionicons
          name="sunny"
          size={16}
          color={!isDark ? '#eab308' : '#94a3b8'} // yellow-500 : slate-400
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setTheme('dark')}
        className={`p-1 rounded-full ${isDark ? 'bg-slate-800 shadow-sm' : 'bg-transparent'}`}
        activeOpacity={0.7}
      >
        <Ionicons
          name="moon"
          size={16}
          color={isDark ? '#38bdf8' : '#64748b'} // sky-400 : slate-500
        />
      </TouchableOpacity>
    </View>
  );
};

