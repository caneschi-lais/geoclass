import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SemestersScreen from '../screens/Coordinator/SemestersScreen';
import StudentsListScreen from '../screens/Coordinator/StudentsListScreen';
import StudentSubjectsScreen from '../screens/Coordinator/StudentSubjectsScreen';

export type CoordinatorStackParamList = {
  Semesters: undefined;
  StudentsList: { semesterId: string };
  StudentSubjects: { studentId: string, studentName: string, semesterId: string };
};

const Stack = createNativeStackNavigator<CoordinatorStackParamList>();

export default function CoordinatorNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Semesters"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Semesters" component={SemestersScreen} />
      <Stack.Screen name="StudentsList" component={StudentsListScreen} />
      <Stack.Screen name="StudentSubjects" component={StudentSubjectsScreen} />
    </Stack.Navigator>
  );
}
