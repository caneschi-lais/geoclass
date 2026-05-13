import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

  const getRightButtonStyles = () => {
    if (!rightButton) return { container: '', text: '', iconColor: '' };
    switch (rightButton.variant) {
      case 'danger':
        return { container: 'bg-red-100 px-3 py-2', text: 'text-red-600', iconColor: '#dc2626' };
      case 'info':
        return { container: 'bg-sky-100 p-2', text: 'text-sky-600 px-2', iconColor: '#0ea5e9' };
      case 'white':
      default:
        return { container: 'bg-white p-2 border border-gray-100 shadow-sm', text: 'text-gray-800 px-2', iconColor: '#334155' };
    }
  };

  const rightBtnStyle = getRightButtonStyles();

  return (
    <View className="flex-row items-center mb-6">
      {showBackButton && (
        <TouchableOpacity
          onPress={onBackPress}
          className="mr-3 bg-white p-2 rounded-full shadow-sm border border-gray-100"
        >
          <Feather name="arrow-left" size={24} color="#334155" />
        </TouchableOpacity>
      )}

      <View className="flex-1">
        <Text className="text-2xl font-extrabold text-gray-800" numberOfLines={1}>{title}</Text>
        {subtitle && <Text className="text-gray-500 font-medium">{subtitle}</Text>}
      </View>

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
  );
}
