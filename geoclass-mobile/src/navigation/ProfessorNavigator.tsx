import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfessorClassesScreen from '../screens/Professor/ProfessorClassesScreen';
import ClassAttendanceScreen from '../screens/Professor/ClassAttendanceScreen';
import ManualAttendanceScreen from '../screens/Professor/ManualAttendanceScreen';

export type ProfessorStackParamList = {
  Classes: undefined;
  Attendance: { classId: string; subjectName: string };
  ManualAttendance: { classId: string; subjectName: string };
};

const Stack = createNativeStackNavigator<ProfessorStackParamList>();

export default function ProfessorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Classes" component={ProfessorClassesScreen} />
      <Stack.Screen name="Attendance" component={ClassAttendanceScreen} />
      <Stack.Screen name="ManualAttendance" component={ManualAttendanceScreen} />
    </Stack.Navigator>
  );
}
