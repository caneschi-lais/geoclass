import React from 'react';
import { View, Switch, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <View className="flex-row items-center gap-2">
      <Ionicons 
        name={isDark ? "moon" : "sunny"} 
        size={20} 
        color={isDark ? "#94a3b8" : "#475569"} // slate-400 : slate-600
      />
      <Switch
        trackColor={{ false: '#cbd5e1', true: '#334155' }} // slate-300, slate-700
        thumbColor={isDark ? '#e2e8f0' : '#f8fafc'} // slate-200, slate-50
        ios_backgroundColor="#cbd5e1"
        onValueChange={toggleTheme}
        value={isDark}
      />
    </View>
  );
};
