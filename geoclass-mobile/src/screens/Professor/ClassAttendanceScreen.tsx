import React from 'react';
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfessorStackParamList } from '../../navigation/ProfessorNavigator';
import { useClassAttendance } from '../../hooks/useClassAttendance';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import StudentAttendanceCard from '../../components/StudentAttendanceCard';
import EmptyState from '../../components/EmptyState';
import CalendarModal from '../../components/CalendarModal';
import { Feather } from '@expo/vector-icons';

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
    formatDateDisplay,
    isToday
  } = useClassAttendance(classId);

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      <ScreenHeader 
        title={subjectName}
        subtitle=""
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <TouchableOpacity 
        onPress={() => setCalendarVisible(true)}
        className="flex-row items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 shadow-sm border border-gray-100 dark:border-slate-700/50"
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

      <View className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 p-4 rounded-xl mb-4 flex-row justify-between items-center shadow-sm">
        <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">Presenças hoje</Text>
        <View className="bg-sky-500 dark:bg-sky-600 px-3 py-1 rounded-full">
          <Text className="text-white font-extrabold text-xs">{students.length} Alunos</Text>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentAttendanceCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhum registro de presença ainda." />}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
    </View>
  );
}
