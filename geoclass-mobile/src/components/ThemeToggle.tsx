import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export const ThemeToggle: React.FC = () => {
  const { setTheme, isDark } = useTheme();
  const rotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  // Animação de rotação sempre que o tema muda
  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isDark ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isDark]);

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Mapeia o valor da animação (0 a 1) para um ângulo de rotação (0 a 360 graus)
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      onPress={handleToggle}
      className="p-2 bg-white dark:bg-slate-800 rounded-full border border-gray-200/50 dark:border-slate-700/80 shadow-sm justify-center items-center"
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ rotate: rotation }] }}>
        {isDark ? (
          <Ionicons
            name="moon"
            size={18}
            color="#38bdf8"
          />
        ) : (
          <Ionicons
            name="sunny"
            size={18}
            color="#eab308"
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};
