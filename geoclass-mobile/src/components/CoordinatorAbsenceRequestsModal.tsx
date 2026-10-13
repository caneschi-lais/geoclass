import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import CalendarModal from './CalendarModal';

interface CoordinatorAbsenceRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'REQUESTS' | 'DIRECT';
}

interface AvailableClass {
  id: string;
  subject: string;
  course_name?: string | null;
  room_name?: string;
  schedule_time?: string;
  professor?: {
    name: string;
  };
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
  { key: 'MANUTENCAO', label: 'Manutenção na instituição' },
  { key: 'FERIADO_EXTRA', label: 'Feriado / Recesso institucional' },
  { key: 'OUTROS', label: 'Outros motivos institucionais' },
];

export default function CoordinatorAbsenceRequestsModal({
  visible,
  onClose,
  onSuccess,
  initialTab = 'REQUESTS',
}: CoordinatorAbsenceRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'DIRECT'>(initialTab);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Formulário de Cancelamento Direto
  const todayStr = new Date().toISOString().split('T')[0];
  const [directScope, setDirectScope] = useState<'INSTITUICAO' | 'CURSO' | 'TURMA'>('INSTITUICAO');
  const [directCourseName, setDirectCourseName] = useState('Análise e Desenvolvimento de Sistemas');
  const [directClassName, setDirectClassName] = useState('');
  const [directDate, setDirectDate] = useState(todayStr);
  const [directReason, setDirectReason] = useState('MANUTENCAO');
  const [directDescription, setDirectDescription] = useState('');
  const [directReplacementDate, setDirectReplacementDate] = useState('');
  const [directLoading, setDirectLoading] = useState(false);

  // Turmas disponíveis e seleção de matéria/turma
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassSubject, setSelectedClassSubject] = useState('');
  const [classModalVisible, setClassModalVisible] = useState(false);
  const [classSearch, setClassSearch] = useState('');

  // Date picker modal
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'DATE' | 'REPLACEMENT'>('DATE');

  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  useEffect(() => {
    if (visible && activeTab === 'REQUESTS') {
      loadRequests();
    }
  }, [visible, activeTab]);

  useEffect(() => {
    if (visible && activeTab === 'DIRECT') {
      loadClassesList();
    }
  }, [visible, activeTab]);

  const loadClassesList = async () => {
    setLoadingClasses(true);
    try {
      const response = await api.get('/coordenador/turmas');
      setAvailableClasses(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSelectCalendarDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoString = `${year}-${month}-${day}`;

    if (calendarTarget === 'DATE') {
      setDirectDate(isoString);
    } else {
      setDirectReplacementDate(isoString);
    }
    setCalendarVisible(false);
  };

  const loadRequests = async () => {
    setLoadingClasses(false);
    setLoading(true);
    try {
      const response = await api.get('/coordenador/solicitacoes-falta');
      setRequests(response.data);
    } catch (error) {
      console.error('Erro ao carregar solicitações de falta:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.put(`/coordenador/solicitacoes-falta/${id}/aprovar`);
      const msg = 'Falta aprovada! Alunos foram notificados e presenças parciais registradas.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Aprovado', msg);
      loadRequests();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao aprovar falta:', error);
      const err = error.response?.data?.error || 'Erro ao aprovar solicitação.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.put(`/coordenador/solicitacoes-falta/${id}/rejeitar`);
      const msg = 'Solicitação de falta rejeitada.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Rejeitado', msg);
      loadRequests();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao rejeitar falta:', error);
      const err = error.response?.data?.error || 'Erro ao rejeitar solicitação.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestCertificate = async (id: string) => {
    setProcessingId(id);
    try {
      await api.put(`/coordenador/solicitacoes-falta/${id}/pedir-atestado`);
      const msg = 'Notificação enviada ao professor solicitando o envio do atestado!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sucesso', msg);
    } catch (error: any) {
      console.error('Erro ao pedir atestado:', error);
      const err = error.response?.data?.error || 'Erro ao solicitar atestado.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDirectCancellation = async () => {
    if (!directDate) {
      const msg = 'Informe a data da suspensão das aulas.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    if (directScope === 'CURSO' && !directCourseName.trim()) {
      const msg = 'Por favor, selecione ou digite o curso afetado.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    if (directScope === 'TURMA' && !selectedClassId && !directClassName.trim()) {
      const msg = 'Por favor, selecione a matéria/turma afetada.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    setDirectLoading(true);
    try {
      await api.post('/coordenador/cancelar-aulas', {
        scope: directScope,
        date: directDate,
        reason_type: directReason,
        description: directDescription,
        class_id: directScope === 'TURMA' ? (selectedClassId || undefined) : undefined,
        course_name: directScope === 'CURSO' ? directCourseName.trim() : undefined,
        subject_name: directScope === 'TURMA' ? (selectedClassSubject || directClassName.trim()) : undefined,
        replacement_date: directReplacementDate || undefined,
      });

      const msg = 'Suspensão de aulas registrada! Professores e alunos notificados com sucesso.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sucesso', msg);

      setDirectDescription('');
      setDirectReplacementDate('');
      setSelectedClassId('');
      setSelectedClassSubject('');
      setDirectClassName('');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao registrar suspensão direta:', error);
      const err = error.response?.data?.error || 'Erro ao registrar cancelamento.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setDirectLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpenCertificate = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${api.defaults.baseURL?.replace('/api', '')}${url}`;
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    } else {
      Alert.alert('Atestado Anexado', `Arquivo disponível em: ${fullUrl}`);
    }
  };

  const filteredClasses = availableClasses.filter((c) => {
    if (!classSearch.trim()) return true;
    const q = classSearch.toLowerCase();
    const matchSubject = c.subject?.toLowerCase().includes(q);
    const matchProf = c.professor?.name?.toLowerCase().includes(q);
    const matchCourse = c.course_name?.toLowerCase().includes(q);
    return matchSubject || matchProf || matchCourse;
  });

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
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[90%] border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700">
            <View>
              <Text className="text-lg font-extrabold text-gray-800 dark:text-slate-100">
                Gestão de Ausências & Aulas
              </Text>
              <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                Painel da Coordenação
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View className="flex-row gap-2 my-4 bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setActiveTab('REQUESTS')}
              className={`flex-1 py-2 rounded-lg items-center ${
                activeTab === 'REQUESTS' ? 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'REQUESTS' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                Pedidos de Professores ({requests.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('DIRECT')}
              className={`flex-1 py-2 rounded-lg items-center ${
                activeTab === 'DIRECT' ? 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  activeTab === 'DIRECT' ? 'text-sky-600 dark:text-sky-400' : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                Suspender Aulas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conteúdo da Aba 1: Solicitações de Falta */}
          {activeTab === 'REQUESTS' && (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
              {loading ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color="#0ea5e9" />
                  <Text className="text-xs text-gray-500 mt-2">Buscando pedidos pendentes...</Text>
                </View>
              ) : requests.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Feather name="check-circle" size={40} color="#10b981" />
                  <Text className="text-base font-bold text-gray-800 dark:text-slate-200 mt-3">
                    Nenhuma solicitação pendente!
                  </Text>
                  <Text className="text-xs text-gray-500 text-center mt-1">
                    Não há pedidos de ausência de professores aguardando aprovação.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {requests.map((req) => {
                    const isProcessing = processingId === req.id;
                    return (
                      <View
                        key={req.id}
                        className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-1 pr-2">
                            <Text className="text-sm font-extrabold text-gray-800 dark:text-slate-100">
                              {req.class?.subject}
                            </Text>
                            <Text className="text-xs text-gray-600 dark:text-slate-300 font-semibold mt-0.5">
                              Prof. {req.professor?.name}
                            </Text>
                            <Text className="text-[11px] text-gray-500 mt-0.5">
                              Data da Falta: <Text className="font-bold text-sky-600">{formatDate(req.date)}</Text>
                            </Text>
                          </View>
                          <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            <Text className="text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                              {req.reason_type}
                            </Text>
                          </View>
                        </View>

                        {req.description && (
                          <Text className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 mb-2.5">
                            "{req.description}"
                          </Text>
                        )}

                        {/* Botão para visualizar atestado se houver */}
                        {req.certificate_url ? (
                          <TouchableOpacity
                            onPress={() => handleOpenCertificate(req.certificate_url)}
                            className="flex-row items-center justify-center bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 p-2 rounded-lg mb-3"
                          >
                            <Feather name="file-text" size={14} color="#0ea5e9" />
                            <Text className="text-xs font-bold text-sky-700 dark:text-sky-300 ml-1.5">
                              Visualizar Atestado Médico Anexado
                            </Text>
                          </TouchableOpacity>
                        ) : req.reason_type === 'SAUDE' ? (
                          <TouchableOpacity
                            onPress={() => handleRequestCertificate(req.id)}
                            disabled={isProcessing}
                            className="flex-row items-center justify-center bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-2 rounded-lg mb-3"
                          >
                            <Feather name="bell" size={14} color="#d97706" />
                            <Text className="text-xs font-bold text-amber-700 dark:text-amber-300 ml-1.5">
                              Solicitar Atestado ao Professor
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {/* Ações de Aprovar / Rejeitar */}
                        <View className="flex-row gap-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                          <TouchableOpacity
                            onPress={() => handleReject(req.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-red-50 dark:bg-red-950/30 border border-red-200 py-2.5 rounded-xl items-center"
                          >
                            <Text className="text-red-600 dark:text-red-400 font-bold text-xs">Recusar</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleApprove(req.id)}
                            disabled={isProcessing}
                            className="flex-1 bg-emerald-500 active:bg-emerald-600 py-2.5 rounded-xl items-center flex-row justify-center"
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Feather name="check" size={14} color="#fff" />
                                <Text className="text-white font-bold text-xs ml-1">Aprovar Falta</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}

          {/* Conteúdo da Aba 2: Cancelamento Direto Institucional */}
          {activeTab === 'DIRECT' && (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Escopo da Suspensão:
              </Text>
              <View className="flex-row gap-2 mb-2">
                {[
                  { key: 'INSTITUICAO', label: 'Toda Instituição', icon: 'globe' },
                  { key: 'CURSO', label: 'Por Curso', icon: 'book' },
                  { key: 'TURMA', label: 'Por Turma', icon: 'layers' },
                ].map((s) => {
                  const isSelected = directScope === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setDirectScope(s.key as any)}
                      className={`flex-1 py-2.5 px-1 rounded-xl border items-center justify-center flex-row ${
                        isSelected
                          ? 'bg-sky-500 border-sky-600'
                          : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <Feather
                        name={s.icon as any}
                        size={12}
                        color={isSelected ? '#fff' : '#64748b'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        numberOfLines={1}
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Informação explicativa sobre o escopo selecionado */}
              <View className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 p-2.5 rounded-lg mb-4">
                <Text className="text-[11px] text-sky-800 dark:text-sky-300 font-medium">
                  {directScope === 'INSTITUICAO' && 'Suspensão Geral: todas as turmas e professores da instituição terão aulas suspensas nesta data.'}
                  {directScope === 'CURSO' && 'Suspensão por Curso: apenas as matérias do curso selecionado abaixo serão suspensas.'}
                  {directScope === 'TURMA' && 'Suspensão por Turma: apenas a matéria/turma informada abaixo será suspensa.'}
                </Text>
              </View>

              {/* Seletor de Curso (quando Por Curso) */}
              {directScope === 'CURSO' && (
                <View className="mb-4 bg-sky-50/50 dark:bg-slate-900/70 p-3 rounded-xl border border-sky-200 dark:border-sky-800/60">
                  <Text className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase mb-2">
                    Selecione o Curso Afetado:
                  </Text>
                  
                  <View className="gap-1.5 mb-2.5">
                    {[
                      'Análise e Desenvolvimento de Sistemas',
                      'Gestão Empresarial',
                      'Comércio Exterior',
                    ].map((course) => {
                      const isSelected = directCourseName === course;
                      return (
                        <TouchableOpacity
                          key={course}
                          onPress={() => setDirectCourseName(course)}
                          className={`p-2.5 rounded-lg border flex-row items-center justify-between ${
                            isSelected
                              ? 'bg-sky-100 dark:bg-sky-950/50 border-sky-500'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          <View className="flex-row items-center flex-1 pr-2">
                            <Feather
                              name="book"
                              size={14}
                              color={isSelected ? '#0ea5e9' : '#64748b'}
                              style={{ marginRight: 8 }}
                            />
                            <Text
                              className={`text-xs font-bold ${
                                isSelected ? 'text-sky-800 dark:text-sky-300' : 'text-gray-700 dark:text-slate-300'
                              }`}
                            >
                              {course}
                            </Text>
                          </View>
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

                  <Text className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                    Ou digite o nome de outro curso:
                  </Text>
                  <TextInput
                    value={directCourseName}
                    onChangeText={setDirectCourseName}
                    placeholder="Ex: Recursos Humanos..."
                    placeholderTextColor="#94a3b8"
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-slate-100"
                  />
                </View>
              )}

              {/* Seletor de Matéria / Turma (quando Por Turma) */}
              {directScope === 'TURMA' && (
                <View className="mb-4 bg-sky-50/50 dark:bg-slate-900/70 p-3 rounded-xl border border-sky-200 dark:border-sky-800/60">
                  <Text className="text-xs font-bold text-sky-900 dark:text-sky-200 uppercase mb-2">
                    Selecione a Matéria / Turma Afetada:
                  </Text>
                  
                  <TouchableOpacity
                    onPress={() => setClassModalVisible(true)}
                    activeOpacity={0.7}
                    className="bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-xl p-3 flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center flex-1 pr-2">
                      <View className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 items-center justify-center mr-2.5">
                        <Feather name="layers" size={16} color="#0ea5e9" />
                      </View>
                      <View className="flex-1">
                        {selectedClassSubject ? (
                          <>
                            <Text className="text-xs font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>
                              {selectedClassSubject}
                            </Text>
                            {availableClasses.find(c => c.id === selectedClassId)?.professor?.name && (
                              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                Prof. {availableClasses.find(c => c.id === selectedClassId)?.professor?.name}
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            <Text className="text-xs font-semibold text-gray-400 dark:text-slate-400">
                              Selecione uma matéria existente...
                            </Text>
                            <Text className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">
                              Toque para abrir a lista de matérias
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    <Feather name="chevron-down" size={18} color="#64748b" />
                  </TouchableOpacity>

                  {selectedClassId ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedClassId('');
                        setSelectedClassSubject('');
                        setDirectClassName('');
                      }}
                      className="mt-2 self-start flex-row items-center px-2 py-1 rounded bg-gray-200 dark:bg-slate-700"
                    >
                      <Feather name="x" size={12} color="#64748b" />
                      <Text className="text-[11px] font-semibold text-gray-600 dark:text-slate-300 ml-1">
                        Limpar seleção
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Data sem aula:
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
                      {formatDateFriendly(directDate)}
                    </Text>
                    <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                      Toque para alterar no calendário
                    </Text>
                  </View>
                </View>
                <Feather name="calendar" size={16} color="#0ea5e9" />
              </TouchableOpacity>

              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">
                Motivo da Suspensão:
              </Text>
              <View className="gap-2 mb-4">
                {REASONS.map((r) => {
                  const isSelected = directReason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setDirectReason(r.key)}
                      className={`p-3 rounded-xl border flex-row items-center justify-between ${
                        isSelected
                          ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-500'
                          : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-sky-700 dark:text-sky-400' : 'text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {r.label}
                      </Text>
                      {isSelected && <Feather name="check" size={16} color="#0ea5e9" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Detalhes da Comunicação:
              </Text>
              <TextInput
                value={directDescription}
                onChangeText={setDirectDescription}
                placeholder="Ex: Manutenção elétrica predial no bloco de informática..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-sm text-gray-800 dark:text-slate-100 mb-4"
              />

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
                      <Text className={`text-xs ${directReplacementDate ? 'font-bold text-gray-800 dark:text-slate-100' : 'text-gray-400 dark:text-slate-400'}`}>
                        {directReplacementDate ? formatDateFriendly(directReplacementDate) : 'Nenhuma data de reposição definida'}
                      </Text>
                      <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                        {directReplacementDate ? `Formato: ${directReplacementDate}` : 'Toque para selecionar no calendário'}
                      </Text>
                    </View>
                  </View>
                  <Feather name="calendar" size={16} color="#64748b" />
                </TouchableOpacity>
                {directReplacementDate ? (
                  <TouchableOpacity
                    onPress={() => setDirectReplacementDate('')}
                    className="ml-2 p-3 bg-gray-100 dark:bg-slate-700 rounded-xl"
                  >
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleDirectCancellation}
                disabled={directLoading}
                activeOpacity={0.8}
                style={{
                  elevation: 2,
                  shadowColor: '#0ea5e9',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
                className="bg-sky-500 active:bg-sky-600 py-3.5 rounded-xl items-center flex-row justify-center mb-2"
              >
                {directLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="alert-triangle" size={16} color="#fff" />
                    <Text className="text-white font-bold text-xs uppercase ml-1.5">
                      Confirmar Suspensão & Notificar
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>

    {/* Modal Seletor de Matéria / Turma */}
    <Modal
      visible={classModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setClassModalVisible(false)}
    >
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
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
          }}
          className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-lg max-h-[85%] border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700">
            <View>
              <Text className="text-base font-extrabold text-gray-800 dark:text-slate-100">
                Selecionar Matéria / Turma
              </Text>
              <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                Escolha na lista para evitar erros de digitação
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setClassModalVisible(false)}
              className="p-1 rounded-full bg-gray-100 dark:bg-slate-700"
            >
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Barra de Pesquisa */}
          <View className="flex-row items-center bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 my-3">
            <Feather name="search" size={16} color="#64748b" />
            <TextInput
              value={classSearch}
              onChangeText={setClassSearch}
              placeholder="Buscar matéria, professor ou curso..."
              placeholderTextColor="#94a3b8"
              className="flex-1 text-xs font-semibold text-gray-800 dark:text-slate-100 ml-2"
            />
            {classSearch ? (
              <TouchableOpacity onPress={() => setClassSearch('')}>
                <Feather name="x-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Lista de Turmas */}
          {loadingClasses ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#0ea5e9" />
              <Text className="text-xs text-gray-500 mt-2">Carregando matérias cadastradas...</Text>
            </View>
          ) : filteredClasses.length === 0 ? (
            <View className="py-10 items-center justify-center">
              <Feather name="alert-circle" size={32} color="#94a3b8" />
              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 mt-2">
                Nenhuma matéria encontrada
              </Text>
              <Text className="text-[11px] text-gray-400 text-center mt-1">
                Verifique o termo pesquisado ou certifique-se de que há turmas ativas cadastradas.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedClassId === item.id;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedClassId(item.id);
                      setSelectedClassSubject(item.subject);
                      setDirectClassName(item.subject);
                      setClassModalVisible(false);
                    }}
                    className={`p-3 rounded-xl border mb-2 flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className={`text-xs font-extrabold ${
                          isSelected ? 'text-sky-700 dark:text-sky-300' : 'text-gray-800 dark:text-slate-100'
                        }`}
                      >
                        {item.subject}
                      </Text>
                      {item.professor?.name && (
                        <Text className="text-[11px] text-gray-600 dark:text-slate-300 font-semibold mt-0.5">
                          Prof. {item.professor.name}
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2 mt-1">
                        {item.course_name && (
                          <Text className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                            {item.course_name}
                          </Text>
                        )}
                        {item.room_name && (
                          <Text className="text-[10px] text-gray-400">
                            • {item.room_name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View
                      className={`w-5 h-5 rounded-full border items-center justify-center ${
                        isSelected ? 'border-sky-500 bg-sky-500' : 'border-gray-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Feather name="check" size={12} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>

    {/* Modal de Calendário Interativo */}
    <CalendarModal
      visible={calendarVisible}
      onClose={() => setCalendarVisible(false)}
      selectedDate={parseDateStrToDate(calendarTarget === 'DATE' ? directDate : (directReplacementDate || directDate))}
      onSelectDate={handleSelectCalendarDate}
    />
  </>
);
}
