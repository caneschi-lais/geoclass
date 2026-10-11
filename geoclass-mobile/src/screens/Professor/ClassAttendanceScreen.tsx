import React, { useState, useEffect } from 'react';
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfessorStackParamList } from '../../navigation/ProfessorNavigator';
import { useClassAttendance } from '../../hooks/useClassAttendance';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import CalendarModal from '../../components/CalendarModal';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';

type Props = NativeStackScreenProps<ProfessorStackParamList, 'Attendance'>;

export default function ClassAttendanceScreen({ route, navigation }: Props) {
  const { classId, subjectName } = route.params;
  const {
    students,
    loading,
    loadingDate,
    selectedDate,
    setSelectedDate,
    calendarVisible,
    setCalendarVisible,
    attendanceDates,
    replacementDates,
    loadAttendance,
    formatDateDisplay,
    isToday,
  } = useClassAttendance(classId);

  // Estado local para edição das presenças via Checkboxes
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincroniza o estado quando os dados da data são carregados:
  // - Quem teve presença (PRESENTE, ATRASADO, PRESENCA_PARCIAL) vem MARCADO (true)
  // - Quem teve FALTA vem DESMARCADO (false)
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    students.forEach((s) => {
      initial[s.id] = s.status !== 'FALTA';
    });
    setAttendanceState(initial);
    setHasChanges(false);
  }, [students]);

  const toggleStudent = (studentId: string) => {
    setAttendanceState((prev) => {
      const next = { ...prev, [studentId]: !prev[studentId] };
      setHasChanges(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    students.forEach((s) => {
      next[s.id] = true;
    });
    setAttendanceState(next);
    setHasChanges(true);
  };

  const handleDeselectAll = () => {
    const next: Record<string, boolean> = {};
    students.forEach((s) => {
      next[s.id] = false;
    });
    setAttendanceState(next);
    setHasChanges(true);
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;

    setSaving(true);
    try {
      const payload = Object.keys(attendanceState).map((studentId) => ({
        studentId,
        isPresent: attendanceState[studentId],
      }));

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      await api.post(`/professor/turma/${classId}/chamada-manual`, {
        attendances: payload,
        date: dateStr,
      });

      const successMsg = `Presenças salvas com sucesso para o dia ${formatDateDisplay(selectedDate)}!`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Sucesso', successMsg);
      }

      setHasChanges(false);
      loadAttendance(selectedDate);
    } catch (error: any) {
      console.error('Erro ao atualizar chamada:', error);
      const errorMsg = error.response?.data?.error || 'Erro ao salvar alterações da presença.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Erro', errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  // Contadores dinâmicos baseados no estado atual de edição
  const presentCount = Object.values(attendanceState).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  const renderStudentItem = ({ item }: { item: any }) => {
    const isChecked = !!attendanceState[item.id];
    const isParcial = item.status === 'PRESENCA_PARCIAL';
    const semesterLabel = item.student_semester ? `${item.student_semester}º Sem.` : null;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => toggleStudent(item.id)}
        className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border-l-4 ${
          isChecked ? 'border-l-emerald-500' : 'border-l-red-500'
        } border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-gray-700 flex-row justify-between items-center`}
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
          <View className="flex-row flex-wrap items-center gap-2 mt-1">
            <Text className="text-gray-500 dark:text-slate-400 font-medium text-xs">RA: {item.ra}</Text>
            {semesterLabel && (
              <View className="bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                <Text className="text-sky-700 dark:text-sky-400 font-bold text-[10px]">{semesterLabel}</Text>
              </View>
            )}
            {isParcial && (
              <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                <Text className="text-amber-800 dark:text-amber-400 font-bold text-[10px]">Parcial</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center gap-2.5">
          <View
            className={`px-2.5 py-1 rounded-lg ${
              isChecked ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
            }`}
          >
            <Text
              className={`text-xs font-extrabold ${
                isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {isChecked ? 'PRESENTE' : 'FALTA'}
            </Text>
          </View>

          {/* Checkbox Interativo */}
          <View
            className={`w-6 h-6 rounded-lg items-center justify-center border ${
              isChecked ? 'bg-emerald-500 border-emerald-600' : 'bg-white dark:bg-slate-800 border-red-400'
            }`}
          >
            {isChecked && <Feather name="check" size={16} color="#ffffff" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <LoadingOverlay message="Carregando presenças..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {saving && <LoadingOverlay message="Salvando alterações da chamada..." />}

      <ScreenHeader title={subjectName} subtitle="" showBackButton={true} onBackPress={() => navigation.goBack()} />

      {/* Seletor de Data */}
      <TouchableOpacity
        onPress={() => setCalendarVisible(true)}
        className="flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-slate-700/50"
      >
        <View className="flex-row items-center">
          <View className="bg-sky-100 dark:bg-sky-900/30 p-2 rounded-lg mr-3">
            <Feather name="calendar" size={20} color="#0ea5e9" />
          </View>
          <View>
            <Text className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase mb-0.5">Filtrar por Data</Text>
            {loadingDate ? (
              <ActivityIndicator size="small" color="#0ea5e9" style={{ height: 20 }} />
            ) : (
              <Text className="text-base font-bold text-gray-800 dark:text-slate-100">
                {formatDateDisplay(selectedDate)}
              </Text>
            )}
          </View>
        </View>

        <Feather name="chevron-down" size={20} color="#94a3b8" />
      </TouchableOpacity>

      {!isToday(selectedDate) && (
        <TouchableOpacity
          className="self-center bg-sky-100 dark:bg-sky-900/30 px-3 py-1.5 rounded-full mb-3 border border-sky-200/30"
          onPress={() => setSelectedDate(new Date())}
        >
          <Text className="text-xs font-bold text-sky-600 dark:text-sky-400">Ir para Hoje</Text>
        </TouchableOpacity>
      )}

      {/* Barra de Resumo e Atalhos de Edição */}
      <View className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 p-4 rounded-xl mb-3 shadow-sm">
        <View className="flex-row justify-between items-center mb-2.5">
          <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
            {isToday(selectedDate) ? 'Chamada Hoje' : `Registro: ${formatDateDisplay(selectedDate)}`}
          </Text>

          <View className="flex-row gap-2">
            <View className="bg-emerald-500 dark:bg-emerald-600 px-2.5 py-0.5 rounded-full">
              <Text className="text-white font-extrabold text-xs">{presentCount} Presentes</Text>
            </View>
            {absentCount > 0 && (
              <View className="bg-red-500 dark:bg-red-600 px-2.5 py-0.5 rounded-full">
                <Text className="text-white font-extrabold text-xs">{absentCount} Faltas</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instrução e botões de atalho */}
        <View className="flex-row justify-between items-center border-t border-sky-200/50 dark:border-sky-900/50 pt-2.5">
          <Text className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
            Toque no aluno para alterar presença
          </Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={handleSelectAll}
              className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-sky-200 dark:border-slate-700"
            >
              <Text className="text-[10px] font-bold text-sky-600 dark:text-sky-400">Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeselectAll}
              className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-sky-200 dark:border-slate-700"
            >
              <Text className="text-[10px] font-bold text-gray-600 dark:text-slate-400">Nenhum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Botão Salvar Alterações */}
      {students.length > 0 && (
        <TouchableOpacity
          onPress={handleSaveAttendance}
          disabled={saving}
          className={`py-3 px-4 rounded-xl mb-3 flex-row items-center justify-center shadow-md ${
            hasChanges
              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name={hasChanges ? 'save' : 'check'} size={16} color="#fff" className="mr-2" />
              <Text className="text-white font-extrabold text-xs uppercase ml-1.5">
                {hasChanges ? 'Salvar Alterações da Chamada' : 'Confirmar Presenças da Data'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Lista de Alunos */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentItem}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={<EmptyState message="Nenhum aluno registrado para esta data." />}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        attendanceDates={attendanceDates}
        replacementDates={replacementDates}
      />
    </View>
  );
}
