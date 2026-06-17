import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightButton?: {
    label?: string;
    icon?: keyof typeof Feather.glyphMap;
    onPress: () => void;
    variant?: 'danger' | 'info' | 'white';
  };
};

export default function ScreenHeader({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightButton
}: ScreenHeaderProps) {

  const { isDark } = useTheme();

  const getRightButtonStyles = () => {
    if (!rightButton) return { container: '', text: '', iconColor: '' };
    switch (rightButton.variant) {
      case 'danger':
        return { container: 'bg-red-100 dark:bg-red-900/30 px-2 py-1', text: 'text-sm text-red-600 dark:text-red-400', iconColor: isDark ? '#f87171' : '#dc2626' };
      case 'info':
        return { container: 'bg-sky-100 dark:bg-sky-900/30 p-1', text: 'text-sm text-sky-600 dark:text-sky-400', iconColor: isDark ? '#38bdf8' : '#0ea5e9' };
      case 'white':
      default:
        return { container: 'bg-white dark:bg-slate-800 p-1 border border-gray-100 dark:border-slate-700 shadow-sm', text: 'text-sm text-gray-800 dark:text-slate-200', iconColor: isDark ? '#cbd5e1' : '#334155' };
    }
  };

  const rightBtnStyle = getRightButtonStyles();

  return (
    <View className="flex-row items-center mb-6">
      {showBackButton && (
        <TouchableOpacity
          onPress={onBackPress}
          className="mr-2 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-sm border border-gray-100 dark:border-slate-700"
        >
          <Feather name="arrow-left" size={18} color={isDark ? "#cbd5e1" : "#334155"} />
        </TouchableOpacity>
      )}

      <View className="flex-1">
        <Text className="text-xl font-extrabold text-gray-800 dark:text-slate-100" numberOfLines={1}>{title}</Text>
        {subtitle && <Text className="text-gray-500 dark:text-slate-400 font-medium">{subtitle}</Text>}
      </View>

      <View className="flex-row items-center gap-3">
        <ThemeToggle />
        {rightButton && (
          <TouchableOpacity
            onPress={rightButton.onPress}
            className={`rounded-lg flex-row items-center ${rightBtnStyle.container} ${rightButton.label ? '' : 'rounded-full'}`}
          >
            {rightButton.icon && <Feather name={rightButton.icon} size={20} color={rightBtnStyle.iconColor} />}
            {rightButton.label && (
              <Text className={`font-bold ${rightBtnStyle.text} ${rightButton.icon ? 'ml-1' : ''}`}>
                {rightButton.label}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
