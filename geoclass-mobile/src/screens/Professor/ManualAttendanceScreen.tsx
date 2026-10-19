import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import api from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import { Feather } from '@expo/vector-icons';

type EnrolledStudent = {
  id: string;
  name: string;
  ra: string;
  student_semester?: string;
  courses?: string[];
  classSlots?: string[];
};

type Props = {
  navigation: any;
  route: any;
};

export default function ManualAttendanceScreen({ navigation, route }: Props) {
  const { classId, subjectName } = route.params;
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [classId]);

  const loadStudents = async () => {
    try {
      const response = await api.get(`/professor/turma/${classId}/alunos`);
      const studentsData: EnrolledStudent[] = response.data;
      setStudents(studentsData);

      // Inicializar slots como PRESENTE por padrão
      const initialAttendance: Record<string, Record<string, boolean>> = {};
      const fallbackSlots = studentsData[0]?.classSlots || ['19:00', '19:50'];
      studentsData.forEach((s) => {
        initialAttendance[s.id] = {};
        const slots = s.classSlots && s.classSlots.length > 0 ? s.classSlots : fallbackSlots;
        slots.forEach((slotTime) => {
          initialAttendance[s.id][slotTime] = true;
        });
      });
      setAttendanceState(initialAttendance);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar lista de alunos.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSlot = (studentId: string, slotTime: string) => {
    setAttendanceState((prev) => {
      const studentSlots = { ...(prev[studentId] || {}) };
      studentSlots[slotTime] = !studentSlots[slotTime];
      return {
        ...prev,
        [studentId]: studentSlots,
      };
    });
  };

  const toggleAllSlotsForStudent = (studentId: string, slots: string[]) => {
    setAttendanceState((prev) => {
      const studentSlots = prev[studentId] || {};
      const allChecked = slots.length > 0 && slots.every((k) => studentSlots[k]);
      const nextSlots: Record<string, boolean> = {};
      slots.forEach((k) => {
        nextSlots[k] = !allChecked;
      });
      return {
        ...prev,
        [studentId]: nextSlots,
      };
    });
  };

  const handleSelectAll = () => {
    const next: Record<string, Record<string, boolean>> = {};
    const fallbackSlots = students[0]?.classSlots || ['19:00', '19:50'];
    students.forEach((s) => {
      next[s.id] = {};
      const slots = s.classSlots && s.classSlots.length > 0 ? s.classSlots : fallbackSlots;
      slots.forEach((slotTime) => {
        next[s.id][slotTime] = true;
      });
    });
    setAttendanceState(next);
  };

  const handleDeselectAll = () => {
    const next: Record<string, Record<string, boolean>> = {};
    const fallbackSlots = students[0]?.classSlots || ['19:00', '19:50'];
    students.forEach((s) => {
      next[s.id] = {};
      const slots = s.classSlots && s.classSlots.length > 0 ? s.classSlots : fallbackSlots;
      slots.forEach((slotTime) => {
        next[s.id][slotTime] = false;
      });
    });
    setAttendanceState(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = students.map((s) => ({
        studentId: s.id,
        slots: attendanceState[s.id] || {},
      }));

      await api.post(`/professor/turma/${classId}/chamada-manual`, { attendances: payload });

      const numAulas = students[0]?.classSlots?.length || 2;
      const successMessage = `Presença manual salva com sucesso para as ${numAulas} aulas do dia!`;

      if (Platform.OS === 'web') {
        window.alert(successMessage);
        navigation.goBack();
      } else {
        Alert.alert('Sucesso', successMessage, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar chamada.');
    } finally {
      setSaving(false);
    }
  };

  // Contadores dinâmicos de presença por slot de aula
  let totalPresentSlots = 0;
  let totalSlotsCount = 0;
  Object.values(attendanceState).forEach((studentSlots) => {
    Object.values(studentSlots).forEach((isPresent) => {
      totalSlotsCount++;
      if (isPresent) totalPresentSlots++;
    });
  });
  const totalAbsentSlots = totalSlotsCount - totalPresentSlots;

  const renderItem = ({ item }: { item: EnrolledStudent }) => {
    const studentSlotsState = attendanceState[item.id] || {};
    const slots = item.classSlots && item.classSlots.length > 0
      ? item.classSlots
      : ['19:00', '19:50', '20:50', '21:40'];

    const presentSlotsCount = slots.filter((slotTime) => !!studentSlotsState[slotTime]).length;
    const totalSlotsForStudent = slots.length;
    const isAllPresent = presentSlotsCount === totalSlotsForStudent;
    const isParcial = presentSlotsCount > 0 && presentSlotsCount < totalSlotsForStudent;
    const semesterLabel = item.student_semester ? `${item.student_semester}` : null;

    return (
      <View
        className={`bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 border-l-4 ${
          isAllPresent ? 'border-l-emerald-500' : isParcial ? 'border-l-amber-500' : 'border-l-red-500'
        } border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-gray-700 shadow-sm`}
      >
        {/* Header do Card: Nome, RA, Semester, Badge e Ação Rápida */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-gray-500 dark:text-slate-400 font-medium text-xs">RA: {item.ra}</Text>
              {semesterLabel && (
                <View className="bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                  <Text className="text-sky-700 dark:text-sky-400 font-bold text-[10px]">{semesterLabel}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="items-end gap-1.5">
            <View
              className={`px-2.5 py-1 rounded-lg ${
                isAllPresent
                  ? 'bg-emerald-50 dark:bg-emerald-950/30'
                  : isParcial
                  ? 'bg-amber-50 dark:bg-amber-950/30'
                  : 'bg-red-50 dark:bg-red-950/30'
              }`}
            >
              <Text
                className={`text-xs font-extrabold ${
                  isAllPresent
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : isParcial
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isAllPresent ? 'PRESENTE' : isParcial ? `${presentSlotsCount}/${totalSlotsForStudent} Aulas` : 'FALTA'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleAllSlotsForStudent(item.id, slots)}
              className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600"
            >
              <Text className="text-[10px] font-bold text-gray-600 dark:text-slate-300">
                {isAllPresent ? 'Desmarcar' : 'Marcar Todas'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4 Checkboxes de Aulas */}
        <View className="border-t border-gray-100 dark:border-slate-700/60 pt-2.5">
          <Text className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-2">
            Frequência por Aula (Toque no checkbox para alternar):
          </Text>

          <View className="flex-row items-center justify-between gap-1.5">
            {slots.map((slotTime, idx) => {
              const isChecked = !!studentSlotsState[slotTime];
              return (
                <TouchableOpacity
                  key={slotTime || idx}
                  activeOpacity={0.7}
                  onPress={() => toggleStudentSlot(item.id, slotTime)}
                  className={`flex-1 py-2 px-1 rounded-lg items-center justify-center border ${
                    isChecked
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                      : 'bg-gray-50 dark:bg-slate-900/40 border-gray-200 dark:border-slate-700'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold mb-0.5 ${
                      isChecked ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-400'
                    }`}
                  >
                    {idx + 1}ª Aula
                  </Text>
                  <Text className="text-[9px] text-gray-400 dark:text-slate-500 mb-1.5">
                    {slotTime}
                  </Text>

                  <View
                    className={`w-5 h-5 rounded items-center justify-center border ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-600'
                        : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'
                    }`}
                  >
                    {isChecked && <Feather name="check" size={14} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <LoadingOverlay message="Carregando alunos..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {saving && <LoadingOverlay message="Salvando presença manual..." />}

      <ScreenHeader
        title="Presença Manual"
        subtitle={subjectName}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <View className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 p-3.5 rounded-xl mb-3 shadow-sm">
        <Text className="text-xs text-sky-900 dark:text-sky-300 font-medium mb-2.5">
          Em aulas remotas, o Geofencing é desabilitado. Marque os checkboxes das 4 aulas para cada aluno e confirme.
        </Text>

        <View className="flex-row justify-between items-center border-t border-sky-200/50 dark:border-sky-900/50 pt-2.5">
          <View className="flex-row gap-2">
            <View className="bg-emerald-500 dark:bg-emerald-600 px-2.5 py-0.5 rounded-full">
              <Text className="text-white font-extrabold text-xs">{totalPresentSlots} Presenças</Text>
            </View>
            {totalAbsentSlots > 0 && (
              <View className="bg-red-500 dark:bg-red-600 px-2.5 py-0.5 rounded-full">
                <Text className="text-white font-extrabold text-xs">{totalAbsentSlots} Faltas</Text>
              </View>
            )}
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSelectAll}
              className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-sky-200 dark:border-slate-700"
            >
              <Text className="text-[10px] font-bold text-sky-600 dark:text-sky-400">Todas as Aulas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeselectAll}
              className="bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-sky-200 dark:border-slate-700"
            >
              <Text className="text-[10px] font-bold text-gray-600 dark:text-slate-400">Nenhuma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item, index) => `${item.id || index}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      />

      <View className="absolute bottom-5 left-4 right-4">
        <TouchableOpacity
          className="bg-sky-500 active:bg-sky-600 py-3.5 rounded-xl items-center shadow-md flex-row justify-center"
          onPress={handleSave}
          disabled={saving}
        >
          <Feather name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-base">Salvar Chamada EAD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
