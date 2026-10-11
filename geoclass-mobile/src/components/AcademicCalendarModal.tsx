import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: string;
}

interface SemesterInfo {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

interface AcademicCalendarModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AcademicCalendarModal({
  visible,
  onClose,
}: AcademicCalendarModalProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [semesters, setSemesters] = useState<SemesterInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Formulário para adicionar novo dia
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(''); // YYYY-MM-DD
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState('FERIADO');

  useEffect(() => {
    if (visible) {
      loadCalendarData();
    }
  }, [visible]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/coordenador/calendario');
      setEvents(response.data.events || []);
      setSemesters(response.data.semesters || []);
    } catch (error) {
      console.error('Erro ao carregar calendário acadêmico:', error);
      notify('Erro', 'Não foi possível carregar os dados do calendário acadêmico.');
    } finally {
      setLoading(false);
    }
  };

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAddEvent = async () => {
    if (!newDate.trim() || !newDescription.trim()) {
      notify('Campos Obrigatórios', 'Informe a data (YYYY-MM-DD) e a descrição.');
      return;
    }

    // Validação básica de formato de data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newDate.trim())) {
      notify('Formato Inválido', 'A data deve estar no formato AAAA-MM-DD (ex: 2026-04-20).');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/coordenador/calendario', {
        date: newDate.trim(),
        description: newDescription.trim(),
        type: newType,
      });

      notify('Sucesso', 'Dia adicionado ao calendário acadêmico com sucesso!');
      setNewDate('');
      setNewDescription('');
      setShowAddForm(false);
      loadCalendarData();
    } catch (error: any) {
      console.error('Erro ao salvar evento:', error);
      const msg = error.response?.data?.error || 'Erro ao registrar dia no calendário.';
      notify('Erro', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, description: string) => {
    const confirmDelete = async () => {
      try {
        await api.delete(`/coordenador/calendario/${id}`);
        notify('Removido', 'Dia não-letivo removido com sucesso.');
        loadCalendarData();
      } catch (error) {
        console.error('Erro ao excluir evento:', error);
        notify('Erro', 'Falha ao remover o evento do calendário.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Deseja remover "${description}" do calendário acadêmico?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert('Confirmar Exclusão', `Deseja remover "${description}" do calendário?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'FERIADO':
        return { bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400' };
      case 'RECESSO':
        return { bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400' };
      case 'EXAME':
        return { bg: 'bg-purple-100 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400' };
      case 'SPAP':
        return { bg: 'bg-sky-100 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-400' };
      default:
        return { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' };
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[90%] flex-1">
          {/* Cabeçalho do Modal */}
          <View className="flex-row justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
            <View className="flex-row items-center gap-2">
              <View className="bg-sky-100 dark:bg-sky-950/50 p-2.5 rounded-xl">
                <Feather name="calendar" size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">
                  Calendário Acadêmico
                </Text>
                <Text className="text-xs text-gray-500 dark:text-slate-400">
                  Dias sem aula (Feriados, Recessos e SPAP)
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full">
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Resumo dos Semestres */}
          {semesters.length > 0 && (
            <View className="my-3 bg-sky-50 dark:bg-sky-950/30 p-3 rounded-xl border border-sky-100 dark:border-sky-900/50 flex-row justify-around">
              {semesters.map((s) => (
                <View key={s.id} className="items-center">
                  <Text className="text-[11px] font-bold text-sky-800 dark:text-sky-300">
                    Semestre {s.name}
                  </Text>
                  <Text className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                    {formatDateDisplay(s.startDate)} até {formatDateDisplay(s.endDate)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Botão para Alternar Formulário de Adicionar */}
          <TouchableOpacity
            onPress={() => setShowAddForm(!showAddForm)}
            className="flex-row items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-500 active:bg-sky-600 mb-3"
          >
            <Feather name={showAddForm ? 'minus-circle' : 'plus-circle'} size={18} color="#ffffff" />
            <Text className="text-white font-bold text-sm">
              {showAddForm ? 'Fechar Formulário' : 'Adicionar Novo Dia Não-Letivo'}
            </Text>
          </TouchableOpacity>

          {/* Formulário de Adição */}
          {showAddForm && (
            <View className="bg-gray-50 dark:bg-slate-800/80 p-4 rounded-2xl mb-3 border border-gray-200 dark:border-slate-700">
              <Text className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Data do Dia Não-Letivo (AAAA-MM-DD)
              </Text>
              <TextInput
                value={newDate}
                onChangeText={setNewDate}
                placeholder="Ex: 2026-04-20"
                placeholderTextColor="#94a3b8"
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-slate-100 mb-3"
              />

              <Text className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Descrição do Feriado / Recesso
              </Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Ex: Emenda de Feriado Municipal"
                placeholderTextColor="#94a3b8"
                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-slate-100 mb-3"
              />

              <Text className="text-xs font-bold text-gray-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Tipo de Evento
              </Text>
              <View className="flex-row gap-2 mb-3">
                {['FERIADO', 'RECESSO', 'NAO_LETIVO'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setNewType(t)}
                    className={`flex-1 py-1.5 rounded-lg items-center border ${
                      newType === t
                        ? 'bg-sky-500 border-sky-500'
                        : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        newType === t ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                disabled={submitting}
                onPress={handleAddEvent}
                className="bg-emerald-600 active:bg-emerald-700 py-2.5 rounded-xl items-center flex-row justify-center gap-2"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">Salvar no Calendário</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Lista de Eventos */}
          {loading ? (
            <View className="flex-1 justify-center items-center py-10">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                Carregando calendário...
              </Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const badge = getTypeBadgeStyle(item.type);
                return (
                  <View className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl mb-2 flex-row justify-between items-center border border-gray-100 dark:border-slate-800">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-xs font-black text-sky-600 dark:text-sky-400">
                          {formatDateDisplay(item.date)}
                        </Text>
                        <View className={`px-2 py-0.5 rounded ${badge.bg}`}>
                          <Text className={`text-[10px] font-bold ${badge.text}`}>
                            {item.type}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                        {item.description}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(item.id, item.description)}
                      className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg"
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View className="py-10 items-center">
                  <Text className="text-sm text-gray-500 dark:text-slate-400">
                    Nenhum dia não-letivo cadastrado.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
