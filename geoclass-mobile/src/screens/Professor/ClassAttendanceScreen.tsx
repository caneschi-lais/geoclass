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

  // Estado local para edição das presenças via 4 Checkboxes (um por aula)
  const [attendanceState, setAttendanceState] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincroniza o estado quando os dados da data são carregados:
  // Preenche o status de cada slot por aluno (respeitando a quantidade de aulas do dia: 2 ou 4)
  useEffect(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    students.forEach((s) => {
      initial[s.id] = {};
      if (s.slots && s.slots.length > 0) {
        s.slots.forEach((slot) => {
          initial[s.id][slot.slot_time] = slot.isPresent;
        });
      } else {
        const fallbackSlots = students[0]?.slots?.map((sl) => sl.slot_time) || ['19:00', '19:50'];
        const isPres = s.status !== 'FALTA';
        fallbackSlots.forEach((slotTime) => {
          initial[s.id][slotTime] = isPres;
        });
      }
    });
    setAttendanceState(initial);
    setHasChanges(false);
  }, [students]);

  // Alterna um slot individual de um aluno
  const toggleStudentSlot = (studentId: string, slotTime: string) => {
    setAttendanceState((prev) => {
      const studentSlots = { ...(prev[studentId] || {}) };
      studentSlots[slotTime] = !studentSlots[slotTime];
      setHasChanges(true);
      return {
        ...prev,
        [studentId]: studentSlots,
      };
    });
  };

  // Alterna todos os slots de um aluno
  const toggleAllSlotsForStudent = (studentId: string, currentSlots: Array<{ slot_time: string }>) => {
    setAttendanceState((prev) => {
      const studentSlots = prev[studentId] || {};
      const slotKeys = currentSlots.map((s) => s.slot_time);
      const allChecked = slotKeys.length > 0 && slotKeys.every((k) => studentSlots[k]);
      const nextSlots: Record<string, boolean> = {};
      slotKeys.forEach((k) => {
        nextSlots[k] = !allChecked;
      });
      setHasChanges(true);
      return {
        ...prev,
        [studentId]: nextSlots,
      };
    });
  };

  // Marcar todas as aulas para todos os alunos
  const handleSelectAll = () => {
    const next: Record<string, Record<string, boolean>> = {};
    students.forEach((s) => {
      next[s.id] = {};
      const slots = s.slots && s.slots.length > 0
        ? s.slots.map((sl) => sl.slot_time)
        : (students[0]?.slots?.map((sl) => sl.slot_time) || ['19:00', '19:50']);
      slots.forEach((slotTime) => {
        next[s.id][slotTime] = true;
      });
    });
    setAttendanceState(next);
    setHasChanges(true);
  };

  // Desmarcar todas as aulas para todos os alunos
  const handleDeselectAll = () => {
    const next: Record<string, Record<string, boolean>> = {};
    students.forEach((s) => {
      next[s.id] = {};
      const slots = s.slots && s.slots.length > 0
        ? s.slots.map((sl) => sl.slot_time)
        : (students[0]?.slots?.map((sl) => sl.slot_time) || ['19:00', '19:50']);
      slots.forEach((slotTime) => {
        next[s.id][slotTime] = false;
      });
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
        slots: attendanceState[studentId],
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

  const handleResetDeviceBinding = (student: any) => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const confirmationMsg = `Deseja liberar o vínculo de aparelho (Device Binding) de ${student.name} para a aula de ${formatDateDisplay(selectedDate)}?\n\nIsso permitirá que o aluno registre presença usando outro celular hoje.`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmationMsg)) {
        performResetDevice(student, dateStr);
      }
    } else {
      Alert.alert(
        'Liberar Aparelho (Device Binding)',
        confirmationMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Liberar Aparelho',
            style: 'destructive',
            onPress: () => performResetDevice(student, dateStr),
          },
        ]
      );
    }
  };

  const performResetDevice = async (student: any, dateStr: string) => {
    try {
      await api.post('/professor/presenca/reset-device', {
        attendanceId: student.attendance_id,
        studentId: student.id,
        classId: classId,
        date: dateStr,
      });

      const successMsg = `Vínculo de aparelho do aluno ${student.name} liberado com sucesso!`;
      if (Platform.OS === 'web') {
        window.alert(successMsg);
      } else {
        Alert.alert('Sucesso', successMsg);
      }

      loadAttendance(selectedDate);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao liberar vínculo do aparelho.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Erro', errorMsg);
      }
    }
  };

  const renderStudentItem = ({ item }: { item: any }) => {
    const studentSlotsState = attendanceState[item.id] || {};
    const slots = item.slots && item.slots.length > 0
      ? item.slots
      : (students[0]?.slots || [
          { slot_index: 1, slot_time: '19:00', label: '1ª Aula' },
          { slot_index: 2, slot_time: '19:50', label: '2ª Aula' },
        ]);

    const presentSlotsCount = slots.filter((s: any) => !!studentSlotsState[s.slot_time]).length;
    const totalSlotsForStudent = slots.length;
    const isAllPresent = presentSlotsCount === totalSlotsForStudent;
    const isParcial = presentSlotsCount > 0 && presentSlotsCount < totalSlotsForStudent;
    const semesterLabel = item.student_semester ? `${item.student_semester}` : null;

    return (
      <View
        className={`bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border-l-4 ${
          isAllPresent ? 'border-l-emerald-500' : isParcial ? 'border-l-amber-500' : 'border-l-red-500'
        } border border-y-gray-100 dark:border-y-slate-700 border-r-gray-100 dark:border-r-gray-700`}
      >
        {/* Top Header do Card: Nome, RA, Semester, Badge e Ações */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 pr-2">
            <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
            <View className="flex-row flex-wrap items-center gap-2 mt-1">
              <Text className="text-gray-500 dark:text-slate-400 font-medium text-xs">RA: {item.ra}</Text>
              {semesterLabel && (
                <View className="bg-sky-100 dark:bg-sky-950/40 px-2 py-0.5 rounded">
                  <Text className="text-sky-700 dark:text-sky-400 font-bold text-[10px]">{semesterLabel}</Text>
                </View>
              )}
              {/* Botão de Reset de Device Binding */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleResetDeviceBinding(item)}
                className="bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded flex-row items-center border border-sky-200 dark:border-sky-800"
              >
                <Feather name="smartphone" size={10} color="#0ea5e9" style={{ marginRight: 3 }} />
                <Text className="text-[10px] font-bold text-sky-700 dark:text-sky-300">
                  Resetar Aparelho
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Badge de Status Geral do Aluno + Botão Rápido Todas/Nenhuma */}
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

        {/* Separador sutil com os 4 Checkboxes de Aulas */}
        <View className="border-t border-gray-100 dark:border-slate-700/60 pt-2.5">
          <Text className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-2">
            Frequência por Aula (Toque no checkbox para alternar):
          </Text>

          {/* Grid de 4 Checkboxes */}
          <View className="flex-row items-center justify-between gap-1.5">
            {slots.map((slot: any, idx: number) => {
              const isChecked = !!studentSlotsState[slot.slot_time];
              return (
                <TouchableOpacity
                  key={slot.slot_time || idx}
                  activeOpacity={0.7}
                  onPress={() => toggleStudentSlot(item.id, slot.slot_time)}
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
                    {slot.slot_time}
                  </Text>

                  {/* Caixa do Checkbox */}
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
              <Text className="text-white font-extrabold text-xs">{totalPresentSlots} Presenças</Text>
            </View>
            {totalAbsentSlots > 0 && (
              <View className="bg-red-500 dark:bg-red-600 px-2.5 py-0.5 rounded-full">
                <Text className="text-white font-extrabold text-xs">{totalAbsentSlots} Faltas</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instrução e botões de atalho */}
        <View className="flex-row justify-between items-center border-t border-sky-200/50 dark:border-sky-900/50 pt-2.5">
          <Text className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">
            Marque as aulas por aluno
          </Text>
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

      {/* Botão Salvar Alterações */}
      {students.length > 0 && (
        <TouchableOpacity
          onPress={handleSaveAttendance}
          disabled={saving}
          className={`py-3 px-4 rounded-xl mb-3 flex-row items-center justify-center ${
            hasChanges
              ? 'bg-emerald-600 active:bg-emerald-700'
              : 'bg-sky-500 active:bg-sky-600'
          }`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name={hasChanges ? 'save' : 'check'} size={16} color="#fff" style={{ marginRight: 8 }} />
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
        keyExtractor={(item, index) => `${item.id || index}-${index}`}
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
