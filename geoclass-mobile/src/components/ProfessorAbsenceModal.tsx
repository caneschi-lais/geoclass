import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import CalendarModal from './CalendarModal';

interface ProfessorAbsenceModalProps {
  visible: boolean;
  classId: string;
  subjectName: string;
  onClose: () => void;
  onSuccess: () => void;
}

function parseDateStrToDate(str: string): Date {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length === 3) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

function formatDateFriendly(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-').map(Number);
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

const REASONS = [
  { key: 'SAUDE', label: 'Problemas de saúde', icon: 'activity' },
  { key: 'PESSOAL', label: 'Problemas pessoais', icon: 'user' },
  { key: 'ACADEMICO', label: 'Compromisso acadêmico / Congresso', icon: 'book' },
  { key: 'TRANSPORTE', label: 'Dificuldade de transporte / deslocamento', icon: 'navigation' },
  { key: 'OUTROS', label: 'Outros motivos', icon: 'more-horizontal' },
];

export default function ProfessorAbsenceModal({
  visible,
  classId,
  subjectName,
  onClose,
  onSuccess,
}: ProfessorAbsenceModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [selectedReason, setSelectedReason] = useState('SAUDE');
  const [description, setDescription] = useState('');
  const [replacementDate, setReplacementDate] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal de Calendário
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'DATE' | 'REPLACEMENT'>('DATE');

  const handleSelectCalendarDate = (selectedDate: Date) => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;

    if (calendarTarget === 'DATE') {
      setDate(isoString);
    } else {
      setReplacementDate(isoString);
    }
    setCalendarVisible(false);
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedReason('SAUDE');
    setDescription('');
    setReplacementDate('');
    setFileBase64(null);
    setFileName(null);
  };

  const handlePickFile = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            setFileBase64(event.target.result);
            setFileName(file.name);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Anexar Atestado',
        'No dispositivo móvel você pode enviar uma foto ou documento PDF.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Simular Anexo (Demonstração)',
            onPress: () => {
              setFileBase64('data:application/pdf;base64,JVBERi0xLjQKJUZha2VQZGY=');
              setFileName('atestado-medico.pdf');
            },
          },
        ]
      );
    }
  };

  const handleSubmit = async () => {
    if (!date) {
      const msg = 'Por favor, informe a data em que não dará aula.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    if (selectedReason === 'OUTROS' && !description.trim()) {
      const msg = 'Por favor, detalhe o motivo no campo de texto.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    setLoading(true);
    try {
      await api.post('/professor/aviso-falta', {
        class_id: classId,
        date,
        reason_type: selectedReason,
        description: selectedReason === 'OUTROS' ? description : description.trim() || undefined,
        certificate_base64: fileBase64,
        certificate_filename: fileName,
        replacement_date: replacementDate || undefined,
      });

      const successMsg = 'Aviso de ausência enviado para o coordenador com sucesso!';
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert('Sucesso', successMsg);

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar aviso de ausência:', error);
      const errorMsg = error.response?.data?.error || 'Erro ao registrar ausência.';
      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert('Erro', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 16,
          }}
        >
          <View
            style={{
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md max-h-[90%] border border-gray-200 dark:border-slate-700"
          >
            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-extrabold text-gray-800 dark:text-slate-100">
                  Informar Ausência
                </Text>
                <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold" numberOfLines={1}>
                  {subjectName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
              {/* Data da falta */}
              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Data em que não lecionará:
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setCalendarTarget('DATE');
                  setCalendarVisible(true);
                }}
                activeOpacity={0.7}
                className="flex-row items-center justify-between bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-xl px-3.5 py-3 mb-4"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 items-center justify-center mr-2.5">
                    <Feather name="calendar" size={16} color="#0ea5e9" />
                  </View>
                  <View>
                    <Text className="text-xs font-bold text-gray-800 dark:text-slate-100">
                      {formatDateFriendly(date)}
                    </Text>
                    <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                      Toque para alterar no calendário
                    </Text>
                  </View>
                </View>
                <Feather name="calendar" size={16} color="#0ea5e9" />
              </TouchableOpacity>

            {/* Motivo da Falta */}
            <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-2">
              Selecione o Motivo:
            </Text>
            <View className="gap-2 mb-4">
              {REASONS.map((r) => {
                const isSelected = selectedReason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setSelectedReason(r.key)}
                    className={`flex-row items-center p-3 rounded-xl border ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500'
                        : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Feather
                      name={r.icon as any}
                      size={16}
                      color={isSelected ? '#0ea5e9' : '#64748b'}
                      style={{ marginRight: 10 }}
                    />
                    <Text
                      className={`flex-1 text-xs font-bold ${
                        isSelected ? 'text-sky-700 dark:text-sky-400' : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {r.label}
                    </Text>
                    <View
                      className={`w-4 h-4 rounded-full border items-center justify-center ${
                        isSelected ? 'border-sky-500 bg-sky-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <View className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Campo de descrição (obrigatório se OUTROS, opcional se outro) */}
            <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
              {selectedReason === 'OUTROS' ? 'Detalhe o motivo (Obrigatório):' : 'Observações adicionais (Opcional):'}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={
                selectedReason === 'OUTROS'
                  ? 'Descreva o motivo da ausência...'
                  : 'Detalhes para a coordenação...'
              }
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm text-gray-800 dark:text-slate-100 mb-4"
            />

            {/* Atestado Médico (quando saúde) */}
            {selectedReason === 'SAUDE' && (
              <View className="mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl">
                <Text className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-2">
                  Atestado Médico (PDF ou Imagem):
                </Text>
                {fileName ? (
                  <View className="flex-row items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700">
                    <View className="flex-row items-center flex-1 mr-2">
                      <Feather name="file-text" size={16} color="#0ea5e9" style={{ marginRight: 8 }} />
                      <Text
                        className="text-xs font-semibold text-gray-800 dark:text-slate-200 ml-1.5"
                        numberOfLines={1}
                      >
                        {fileName}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setFileBase64(null);
                        setFileName(null);
                      }}
                      className="p-1"
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickFile}
                    className="flex-row items-center justify-center bg-white dark:bg-slate-800 border border-dashed border-amber-400 dark:border-amber-600 p-3 rounded-lg"
                  >
                    <Feather name="upload-cloud" size={18} color="#d97706" />
                    <Text className="text-xs font-bold text-amber-700 dark:text-amber-400 ml-2">
                      Anexar Atestado (PDF ou Foto)
                    </Text>
                  </TouchableOpacity>
                )}
                <Text className="text-[10px] text-amber-600 dark:text-amber-500 mt-1.5">
                  Caso não possua o atestado no momento, você poderá enviá-lo posteriormente pela solicitação da coordenação.
                </Text>
              </View>
            )}

            {/* Data de Reposição (Opcional agora) */}
            <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
              Data Sugerida para Reposição (Opcional):
            </Text>
            <View className="flex-row items-center mb-6">
              <TouchableOpacity
                onPress={() => {
                  setCalendarTarget('REPLACEMENT');
                  setCalendarVisible(true);
                }}
                activeOpacity={0.7}
                className="flex-1 flex-row items-center justify-between bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-3"
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 items-center justify-center mr-2.5">
                    <Feather name="clock" size={16} color="#64748b" />
                  </View>
                  <View>
                    <Text className={`text-xs ${replacementDate ? 'font-bold text-gray-800 dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}`}>
                      {replacementDate ? formatDateFriendly(replacementDate) : 'Nenhuma data de reposição definida'}
                    </Text>
                    <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                      {replacementDate ? `Formato: ${replacementDate}` : 'Pode definir depois ou tocar para selecionar'}
                    </Text>
                  </View>
                </View>
                <Feather name="calendar" size={16} color="#64748b" />
              </TouchableOpacity>
              {replacementDate ? (
                <TouchableOpacity
                  onPress={() => setReplacementDate('')}
                  className="ml-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-xl"
                >
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Ações */}
            <View className="flex-row gap-3 pb-2">
              <TouchableOpacity
                onPress={onClose}
                disabled={loading}
                className="flex-1 bg-gray-100 dark:bg-slate-700 py-3.5 rounded-xl items-center"
              >
                <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase">Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
                style={{
                  elevation: 2,
                  shadowColor: '#0ea5e9',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
                className="flex-1 bg-sky-500 active:bg-sky-600 py-3.5 rounded-xl items-center flex-row justify-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={14} color="#fff" />
                    <Text className="text-white font-bold text-xs uppercase ml-1.5">Enviar Aviso</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Modal de Calendário Interativo */}
    <CalendarModal
      visible={calendarVisible}
      onClose={() => setCalendarVisible(false)}
      selectedDate={parseDateStrToDate(calendarTarget === 'DATE' ? date : (replacementDate || date))}
      onSelectDate={handleSelectCalendarDate}
    />
  </>
);
}
