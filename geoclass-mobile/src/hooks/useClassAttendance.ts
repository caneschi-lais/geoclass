import { useEffect, useState } from 'react';
import api from '../services/api';
import { StudentAttendance } from '../types';

export function useClassAttendance(classId: string) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDate, setLoadingDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);

  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);

  useEffect(() => {
    loadAttendanceDates();
  }, [classId]);

  const loadAttendanceDates = async () => {
    try {
      const response = await api.get(`/professor/turma/${classId}/datas-chamada`);
      setAttendanceDates(response.data);
    } catch (error) {
      console.log('Error loading attendance dates', error);
    }
  };

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
      // Atualizar as datas com chamada para refletir qualquer chamada recente
      loadAttendanceDates();
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

  return {
    students,
    loading,
    loadingDate,
    selectedDate,
    setSelectedDate,
    calendarVisible,
    setCalendarVisible,
    attendanceDates,
    loadAttendance,
    loadAttendanceDates,
    formatDateDisplay,
    isToday
  };
}
