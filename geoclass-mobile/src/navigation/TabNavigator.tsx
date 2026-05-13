import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/Student/HomeScreen';
import DashboardScreen from '../screens/Student/DashboardScreen';
import HistoryScreen from '../screens/Student/HistoryScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0ea5e9', // sky-500
        tabBarInactiveTintColor: '#94a3b8', // slate-400
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      }}
    >
      <Tab.Screen
        name="Matérias"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="map-pin" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Desempenho"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="pie-chart" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Histórico"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}
