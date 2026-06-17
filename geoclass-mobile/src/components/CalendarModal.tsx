import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function CalendarModal({ visible, onClose, selectedDate, onSelectDate }: CalendarModalProps) {
  const [currentYear, setCurrentYear] = useState<number>(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(selectedDate.getMonth());

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Sincroniza o calendário interno quando abre com uma nova data selecionada
  useEffect(() => {
    if (visible) {
      setCurrentMonth(selectedDate.getMonth());
      setCurrentYear(selectedDate.getFullYear());
    }
  }, [visible, selectedDate]);

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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/50 p-6">
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-xl border border-gray-150 dark:border-slate-700">
          
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

          <View className="flex-row justify-between mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
              <View key={idx} style={{ width: 36, alignItems: 'center' }}>
                <Text className="text-xs font-bold text-gray-400 dark:text-slate-500">{day}</Text>
              </View>
            ))}
          </View>

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
                      onSelectDate(item);
                      onClose();
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

          <View className="flex-row justify-between mt-4 border-t border-gray-150 dark:border-slate-700/80 pt-4">
            <TouchableOpacity
              onPress={() => {
                onSelectDate(new Date());
                onClose();
              }}
              className="bg-sky-50 dark:bg-sky-900/30 px-3 py-2 rounded-lg border border-sky-200/40"
            >
              <Text className="text-sky-600 dark:text-sky-400 font-bold text-xs">Ir para Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600"
            >
              <Text className="text-gray-700 dark:text-slate-200 font-bold text-xs">Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
