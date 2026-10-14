import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import CalendarModal from './CalendarModal';

interface ScheduleReplacementModalProps {
  visible: boolean;
  cancellation: any | null;
  userRole?: 'PROFESSOR' | 'COORDENADOR';
  onClose: () => void;
  onSuccess: () => void;
}

function parseDateStrToDate(str: string): Date {
  if (!str) return new Date();
  const cleanStr = String(str).split('T')[0];
  const parts = cleanStr.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

function formatDateFriendly(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const weekDay = weekDays[d.getDay()];
      return `${day}/${month}/${year} (${weekDay})`;
    }
  } catch (e) {}
  return dateStr;
}

export default function ScheduleReplacementModal({
  visible,
  cancellation,
  userRole = 'PROFESSOR',
  onClose,
  onSuccess,
}: ScheduleReplacementModalProps) {
  const [replacementDate, setReplacementDate] = useState('');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && cancellation) {
      if (cancellation.replacement_date) {
        setReplacementDate(String(cancellation.replacement_date).split('T')[0]);
      } else {
        // Sugere por padrão uma semana após a data da falta
        try {
          const original = new Date(String(cancellation.date).split('T')[0]);
          original.setDate(original.getDate() + 7);
          setReplacementDate(original.toISOString().split('T')[0]);
        } catch (e) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setReplacementDate(tomorrow.toISOString().split('T')[0]);
        }
      }
    }
  }, [visible, cancellation]);

  const handleSelectDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setReplacementDate(`${year}-${month}-${day}`);
    setCalendarVisible(false);
  };

  const handleSave = async () => {
    if (!cancellation?.id) return;
    if (!replacementDate || replacementDate.length < 10) {
      const msg = 'Por favor, selecione uma data válida no calendário.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    setLoading(true);
    try {
      const endpoint = userRole === 'COORDENADOR'
        ? `/coordenador/reposicao/${cancellation.id}/agendar`
        : `/professor/reposicao/${cancellation.id}/agendar`;

      await api.put(endpoint, {
        replacement_date: replacementDate,
      });

      const originalDateDisplay = formatDateFriendly(cancellation.date);
      const repDateDisplay = formatDateFriendly(replacementDate);
      const subjectName = cancellation.class?.subject || cancellation.subject_name || 'Matéria';

      const successMsg = `Data de reposição de ${subjectName} agendada para ${repDateDisplay} (referente à falta do dia ${originalDateDisplay})!\n\nTodos os alunos matriculados e o professor responsável foram notificados automaticamente.`;

      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert('Sucesso', successMsg);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao agendar reposição:', error);
      const err = error.response?.data?.error || 'Erro ao agendar data de reposição.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !cancellation) return null;

  const subjectName = cancellation.class?.subject || cancellation.subject_name || 'Matéria Selecionada';
  const originalDateDisplay = formatDateFriendly(cancellation.date);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: 16,
          }}
        >
          <View
            style={{
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg border border-gray-200 dark:border-slate-700"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 mb-4">
              <View>
                <Text className="text-lg font-extrabold text-gray-800 dark:text-slate-100">
                  Agendar Aula de Reposição
                </Text>
                <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                  Defina a data e notifique todos da matéria
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Dados da Aula Original Cancelada */}
            <View className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-2xl mb-4">
              <View className="flex-row items-center mb-1.5">
                <Feather name="alert-triangle" size={15} color="#d97706" style={{ marginRight: 6 }} />
                <Text className="text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase">
                  Aula que Não Teve Aula:
                </Text>
              </View>
              <Text className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mb-0.5">
                {subjectName}
              </Text>
              <Text className="text-xs text-amber-800 dark:text-amber-300 font-bold">
                Data sem aula: {originalDateDisplay}
              </Text>
              {cancellation.reason_type && (
                <Text className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  Motivo: {cancellation.reason_type}
                </Text>
              )}
            </View>

            {/* Formulário de Seleção da Nova Data via Calendário */}
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">
                Selecione a Nova Data para a Reposição:
              </Text>

              {/* Input clicável de Calendário */}
              <TouchableOpacity
                onPress={() => setCalendarVisible(true)}
                activeOpacity={0.7}
                className="bg-gray-50 dark:bg-slate-900 border border-sky-300 dark:border-sky-800 rounded-2xl p-3.5 flex-row items-center justify-between"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-10 h-10 rounded-xl bg-sky-500 items-center justify-center mr-3 shadow-sm">
                    <Feather name="calendar" size={18} color="#ffffff" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] text-sky-600 dark:text-sky-400 font-extrabold uppercase tracking-wider">
                      Data da Reposição:
                    </Text>
                    <Text className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mt-0.5">
                      {replacementDate ? formatDateFriendly(replacementDate) : 'Toque para escolher no calendário'}
                    </Text>
                  </View>
                </View>
                <View className="bg-sky-100 dark:bg-sky-950/60 px-2.5 py-1.5 rounded-lg flex-row items-center">
                  <Text className="text-[11px] font-bold text-sky-700 dark:text-sky-300 mr-1">Escolher</Text>
                  <Feather name="chevron-right" size={14} color="#0284c7" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Aviso sobre notificações automáticas */}
            <View className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 p-3 rounded-xl mb-5 flex-row items-start">
              <Feather name="bell" size={15} color="#0ea5e9" style={{ marginRight: 8, marginTop: 2 }} />
              <Text className="text-[11px] text-sky-800 dark:text-sky-300 font-medium flex-1 leading-relaxed">
                Ao confirmar, a data será vinculada à ausência original e uma notificação oficial será enviada automaticamente para todos os alunos e para o professor da matéria.
              </Text>
            </View>

            {/* Botões de Ação Ajustados */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
                className="flex-1 bg-gray-100 dark:bg-slate-700 py-3.5 rounded-xl items-center justify-center border border-gray-200 dark:border-slate-600"
              >
                <Text numberOfLines={1} className="text-gray-700 dark:text-slate-200 font-bold text-xs uppercase">
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
                className="flex-1 bg-sky-500 active:bg-sky-600 py-3.5 rounded-xl items-center justify-center flex-row shadow-sm"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#fff" />
                    <Text numberOfLines={1} className="text-white font-extrabold text-xs uppercase ml-1.5">
                      Confirmar Data
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Calendário Interativo */}
      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        selectedDate={parseDateStrToDate(replacementDate)}
        onSelectDate={handleSelectDate}
      />
    </>
  );
}
