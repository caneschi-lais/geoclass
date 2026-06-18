import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import api from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';

type EnrolledStudent = {
  id: string;
  name: string;
  ra: string;
};

type AttendanceRecord = {
  studentId: string;
  isPresent: boolean;
};

type Props = {
  navigation: any;
  route: any;
};

export default function ManualAttendanceScreen({ navigation, route }: Props) {
  const { classId, subjectName } = route.params;
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const loadStudents = async () => {
    try {
      const response = await api.get(`/professor/turma/${classId}/alunos`);
      const studentsData = response.data;
      setStudents(studentsData);

      // Inicializar todo mundo como PRESENTE por padrão para facilitar
      const initialAttendance: Record<string, boolean> = {};
      studentsData.forEach((s: EnrolledStudent) => {
        initialAttendance[s.id] = true;
      });
      setAttendanceState(initialAttendance);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar lista de alunos.');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = Object.keys(attendanceState).map(studentId => ({
        studentId,
        isPresent: attendanceState[studentId]
      }));

      await api.post(`/professor/turma/${classId}/chamada-manual`, { attendances: payload });

      if (Platform.OS === 'web') {
        window.alert('Chamada remota salva com sucesso!');
        navigation.goBack();
      } else {
        Alert.alert('Sucesso', 'Chamada remota salva com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar chamada.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: EnrolledStudent }) => {
    const isPresent = attendanceState[item.id];

    return (
      <View className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 border border-gray-100 dark:border-slate-700 flex-row items-center justify-between shadow-sm">
        <View className="flex-1 pr-4">
          <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
          <Text className="text-gray-500 dark:text-slate-400 mt-1">RA: {item.ra}</Text>
        </View>
        <View className="items-center">
          <Switch
            value={isPresent}
            onValueChange={() => toggleAttendance(item.id)}
            trackColor={{ false: '#fca5a5', true: '#6ee7b7' }}
            thumbColor={isPresent ? '#10b981' : '#ef4444'}
          />
          <Text className={`text-xs font-bold mt-1 ${isPresent ? 'text-emerald-600' : 'text-red-600'}`}>
            {isPresent ? 'PRESENTE' : 'FALTA'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingOverlay message="Carregando alunos..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {saving && <LoadingOverlay message="Salvando chamada..." />}

      <ScreenHeader
        title="Chamada EAD"
        subtitle={subjectName}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <View className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-4 rounded-xl mb-4">
        <Text className="text-gray-800 dark:text-gray-100 font-medium">
          Em aulas remotas, o Geofencing dos alunos é desabilitado. Defina quem está presente na aula de hoje e salve.
        </Text>
      </View>

      <FlatList
        data={students}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <View className="absolute bottom-6 left-4 right-4">
        <TouchableOpacity
          className="bg-sky-500 py-4 rounded-xl items-center shadow-md"
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white font-bold text-lg">Salvar Chamada EAD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
