import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, ActivityIndicator, Modal } from 'react-native';
import api from '../../services/api';
import { StudentAttendance } from '../../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfessorStackParamList } from '../../navigation/ProfessorNavigator';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import StudentAttendanceCard from '../../components/StudentAttendanceCard';
import EmptyState from '../../components/EmptyState';
import { Feather } from '@expo/vector-icons';

type Props = NativeStackScreenProps<ProfessorStackParamList, 'Attendance'>;

export default function ClassAttendanceScreen({ route, navigation }: Props) {
  const { classId, subjectName } = route.params;
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDate, setLoadingDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Estados do modal de calendário
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    loadAttendance(selectedDate, !initialLoaded);
    if (!initialLoaded) setInitialLoaded(true);
  }, [classId, selectedDate]);

  const loadAttendance = async (dateToLoad: Date, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingDate(true);
      }
      const dateStr = formatDateApi(dateToLoad);
      const response = await api.get(`/professor/turma/${classId}/presencas?date=${dateStr}`);
      setStudents(response.data);
    } catch (error) {
      console.log('Error loading attendance', error);
    } finally {
      setLoading(false);
      setLoadingDate(false);
    }
  };

  const formatDateDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateApi = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (date: Date) => {
    return isSameDay(new Date(), date);
  };

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  };

  const changeMonth = (offset: number) => {
    let nextMonth = currentMonth + offset;
    let nextYear = currentYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    } else if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
  };

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      <ScreenHeader 
        title={subjectName}
        subtitle=""
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Seletor de Data por Calendário */}
      <TouchableOpacity 
        onPress={() => {
          setCurrentMonth(selectedDate.getMonth());
          setCurrentYear(selectedDate.getFullYear());
          setCalendarVisible(true);
        }}
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

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StudentAttendanceCard item={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhum registro de presença ainda." />}
      />

      {/* Modal do Calendário */}
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-6">
          <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-xl border border-gray-150 dark:border-slate-700">
            {/* Cabeçalho do Calendário */}
            <View className="flex-row justify-between items-center mb-4">
              <TouchableOpacity onPress={() => changeMonth(-1)} className="p-1">
                <Feather name="chevron-left" size={24} color="#0ea5e9" />
              </TouchableOpacity>
              <Text className="text-base font-extrabold text-gray-800 dark:text-slate-100">
                {monthNames[currentMonth]} {currentYear}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} className="p-1">
                <Feather name="chevron-right" size={24} color="#0ea5e9" />
              </TouchableOpacity>
            </View>

            {/* Dias da Semana */}
            <View className="flex-row justify-between mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                <View key={idx} style={{ width: 36, alignItems: 'center' }}>
                  <Text className="text-xs font-bold text-gray-400 dark:text-slate-500">{day}</Text>
                </View>
              ))}
            </View>

            {/* Grid de Dias */}
            <View className="h-64 justify-center items-center">
              <FlatList
                data={getDaysInMonth(currentYear, currentMonth)}
                keyExtractor={(item, index) => item ? item.toISOString() : `empty-${index}`}
                numColumns={7}
                key={`calendar-${currentYear}-${currentMonth}`}
                renderItem={({ item }) => {
                  if (!item) {
                    return <View style={{ width: 36, height: 36, margin: 2 }} />;
                  }
                  const isSelected = isSameDay(selectedDate, item);
                  const isTodayDate = isToday(item);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedDate(item);
                        setCalendarVisible(false);
                      }}
                      style={{ width: 36, height: 36, margin: 2 }}
                      className={`rounded-full items-center justify-center ${
                        isSelected 
                          ? 'bg-sky-500 shadow-sm' 
                          : isTodayDate 
                            ? 'border border-sky-500 bg-sky-50 dark:bg-sky-950/20' 
                            : 'bg-transparent'
                      }`}
                    >
                      <Text className={`font-bold text-sm ${
                        isSelected 
                          ? 'text-white' 
                          : isTodayDate 
                            ? 'text-sky-600 dark:text-sky-400' 
                            : 'text-gray-800 dark:text-slate-200'
                      }`}>
                        {item.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>

            {/* Botões de Ação */}
            <View className="flex-row justify-between mt-4 border-t border-gray-150 dark:border-slate-700/80 pt-4">
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(new Date());
                  setCalendarVisible(false);
                }}
                className="bg-sky-50 dark:bg-sky-900/30 px-3 py-2 rounded-lg border border-sky-200/40"
              >
                <Text className="text-sky-600 dark:text-sky-400 font-bold text-xs">Ir para Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCalendarVisible(false)}
                className="bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600"
              >
                <Text className="text-gray-700 dark:text-slate-200 font-bold text-xs">Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
