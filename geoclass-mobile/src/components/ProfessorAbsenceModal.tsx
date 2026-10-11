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

interface ProfessorAbsenceModalProps {
  visible: boolean;
  classId: string;
  subjectName: string;
  onClose: () => void;
  onSuccess: () => void;
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/60 p-4">
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-md max-h-[90%] shadow-2xl border border-gray-150 dark:border-slate-700">
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
              Data em que não lecionará (AAAA-MM-DD):
            </Text>
            <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 mb-4">
              <Feather name="calendar" size={16} color="#0ea5e9" className="mr-2" />
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="Ex: 2026-10-15"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100 ml-2"
              />
            </View>

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
                      <Feather name="file-text" size={16} color="#0ea5e9" className="mr-2" />
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
            <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 mb-6">
              <Feather name="clock" size={16} color="#64748b" className="mr-2" />
              <TextInput
                value={replacementDate}
                onChangeText={setReplacementDate}
                placeholder="Ex: 2026-10-22 (Pode definir depois)"
                placeholderTextColor="#94a3b8"
                className="flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100 ml-2"
              />
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
                className="flex-1 bg-sky-500 hover:bg-sky-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-md shadow-sky-500/20"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={14} color="#fff" className="mr-1.5" />
                    <Text className="text-white font-bold text-xs uppercase ml-1.5">Enviar Aviso</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
