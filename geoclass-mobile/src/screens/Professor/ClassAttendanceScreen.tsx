import React, { useEffect, useState } from 'react';
import { View, FlatList } from 'react-native';
import api from '../../services/api';
import { StudentAttendance } from '../../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfessorStackParamList } from '../../navigation/ProfessorNavigator';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import StudentAttendanceCard from '../../components/StudentAttendanceCard';
import EmptyState from '../../components/EmptyState';

type Props = NativeStackScreenProps<ProfessorStackParamList, 'Attendance'>;

export default function ClassAttendanceScreen({ route, navigation }: Props) {
  const { classId, subjectName } = route.params;
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, [classId]);

  const loadAttendance = async () => {
    try {
      const response = await api.get(`/professor/turma/${classId}/presencas`);
      setStudents(response.data);
    } catch (error) {
      console.log('Error loading attendance', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 pt-14 px-4">
      <ScreenHeader 
        title={subjectName}
        subtitle="Presenças de Hoje"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentAttendanceCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhum registro de presença ainda." />}
      />
    </View>
  );
}
