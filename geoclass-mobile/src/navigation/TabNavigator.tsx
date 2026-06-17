import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/Student/HomeScreen';
import DashboardScreen from '../screens/Student/DashboardScreen';
import HistoryScreen from '../screens/Student/HistoryScreen';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9', // sky-500
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderTopColor: isDark ? '#1e293b' : '#f1f5f9',
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        }
      }}
    >
      <Tab.Screen
        name="Matérias"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="map-pin" size={20} color={color} />
        }}
      />
      <Tab.Screen
        name="Desempenho"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="pie-chart" size={20} color={color} />
        }}
      />
      <Tab.Screen
        name="Histórico"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={20} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}
