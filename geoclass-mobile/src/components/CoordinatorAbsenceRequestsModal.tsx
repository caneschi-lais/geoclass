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
  Image,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import CalendarModal from './CalendarModal';
import ScheduleReplacementModal from './ScheduleReplacementModal';

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

const REASON_LABELS: Record<string, string> = {
  SAUDE: 'Problemas de saúde',
  PESSOAL: 'Problemas pessoais',
  ACADEMICO: 'Compromisso acadêmico',
  TRANSPORTE: 'Dificuldade de transporte',
  MANUTENCAO: 'Manutenção na instituição',
  FERIADO_EXTRA: 'Feriado / Recesso institucional',
  OUTROS: 'Outros motivos',
};

type RequestSubFilter = 'PENDENTES' | 'APROVADOS' | 'REPROVADOS' | 'ATESTADOS';

export default function CoordinatorAbsenceRequestsModal({
  visible,
  onClose,
  onSuccess,
  initialTab = 'REQUESTS',
}: CoordinatorAbsenceRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'DIRECT'>(initialTab);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestFilter, setRequestFilter] = useState<RequestSubFilter>('PENDENTES');
  const [previewCertificateUrl, setPreviewCertificateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [schedulingCancellation, setSchedulingCancellation] = useState<any | null>(null);

  // Formulário de Cancelamento Direto
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [directScope, setDirectScope] = useState<'INSTITUICAO' | 'CURSO' | 'TURMA'>('TURMA');
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

    const classIdentifier = selectedClassId || selectedClassSubject.trim() || directClassName.trim();
    if (directScope === 'TURMA' && !classIdentifier) {
      const msg = 'Por favor, selecione ou digite a matéria/turma que terá a aula suspensa.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Atenção', msg);
      return;
    }

    setDirectLoading(true);
    try {
      const response = await api.post('/coordenador/cancelar-aulas', {
        scope: directScope,
        date: directDate,
        reason_type: directReason,
        description: directDescription,
        class_id: directScope === 'TURMA' ? (selectedClassId || undefined) : undefined,
        course_name: directScope === 'CURSO' ? directCourseName.trim() : undefined,
        subject_name: directScope === 'TURMA' ? (selectedClassSubject || directClassName.trim()) : undefined,
        replacement_date: directReplacementDate || undefined,
      });

      const count = response.data?.count ?? 1;
      const msg = `Suspensão registrada com sucesso no banco de dados para ${count} matéria(s)! Os alunos matriculados e o professor responsável foram notificados.`;
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
      const err = error.response?.data?.error || error.message || 'Erro ao registrar cancelamento.';
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
    const isImage = /\.(jpeg|jpg|png|webp)($|\?)/i.test(fullUrl);
    if (isImage) {
      setPreviewCertificateUrl(fullUrl);
    } else {
      if (Platform.OS === 'web') {
        window.open(fullUrl, '_blank');
      } else {
        Linking.openURL(fullUrl).catch(() => {
          Alert.alert('Atestado Anexado', `Arquivo disponível em: ${fullUrl}`);
        });
      }
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

          {/* Conteúdo da Aba 1: Solicitações de Falta com Filtros */}
          {activeTab === 'REQUESTS' && (() => {
            const pendingRequests = requests.filter((r) => r.status === 'PENDENTE');
            const approvedRequests = requests.filter((r) => r.status === 'APROVADO');
            const rejectedRequests = requests.filter((r) => r.status === 'REJEITADO');
            const certificateRequests = requests.filter((r) => !!r.certificate_url);

            const displayedRequests = requests.filter((r) => {
              if (requestFilter === 'PENDENTES') return r.status === 'PENDENTE';
              if (requestFilter === 'APROVADOS') return r.status === 'APROVADO';
              if (requestFilter === 'REPROVADOS') return r.status === 'REJEITADO';
              if (requestFilter === 'ATESTADOS') return !!r.certificate_url;
              return true;
            });

            return (
              <View className="flex-1">
                {/* Filtros da Aba de Pedidos: Pendentes, Aprovados, Recusados, Atestados */}
                <View className="flex-row gap-1.5 mb-3">
                  <TouchableOpacity
                    onPress={() => setRequestFilter('PENDENTES')}
                    className={`flex-1 py-1.5 px-1 rounded-xl items-center border ${
                      requestFilter === 'PENDENTES'
                        ? 'bg-amber-500 border-amber-600'
                        : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-[10px] font-bold ${
                        requestFilter === 'PENDENTES' ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      Pendentes ({pendingRequests.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRequestFilter('APROVADOS')}
                    className={`flex-1 py-1.5 px-1 rounded-xl items-center border ${
                      requestFilter === 'APROVADOS'
                        ? 'bg-emerald-600 border-emerald-700'
                        : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-[10px] font-bold ${
                        requestFilter === 'APROVADOS' ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      Aprovados ({approvedRequests.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRequestFilter('REPROVADOS')}
                    className={`flex-1 py-1.5 px-1 rounded-xl items-center border ${
                      requestFilter === 'REPROVADOS'
                        ? 'bg-rose-600 border-rose-700'
                        : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-[10px] font-bold ${
                        requestFilter === 'REPROVADOS' ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      Recusados ({rejectedRequests.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setRequestFilter('ATESTADOS')}
                    className={`flex-1 py-1.5 px-1 rounded-xl items-center border ${
                      requestFilter === 'ATESTADOS'
                        ? 'bg-sky-500 border-sky-600'
                        : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-[10px] font-bold ${
                        requestFilter === 'ATESTADOS' ? 'text-white' : 'text-gray-600 dark:text-slate-300'
                      }`}
                    >
                      Atestados ({certificateRequests.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="max-h-[460px]">
                  {loading ? (
                    <View className="py-12 items-center justify-center">
                      <ActivityIndicator size="large" color="#0ea5e9" />
                      <Text className="text-xs text-gray-500 mt-2 font-medium">Buscando solicitações...</Text>
                    </View>
                  ) : displayedRequests.length === 0 ? (
                    <View className="py-12 items-center justify-center">
                      <Feather
                        name={requestFilter === 'ATESTADOS' ? 'file-text' : 'check-circle'}
                        size={40}
                        color={requestFilter === 'ATESTADOS' ? '#0ea5e9' : '#10b981'}
                      />
                      <Text className="text-base font-bold text-gray-800 dark:text-slate-200 mt-3 text-center">
                        {requestFilter === 'PENDENTES'
                          ? 'Nenhuma solicitação pendente!'
                          : requestFilter === 'APROVADOS'
                          ? 'Nenhuma ausência aprovada!'
                          : requestFilter === 'REPROVADOS'
                          ? 'Nenhuma ausência recusada!'
                          : 'Nenhum atestado médico anexado!'}
                      </Text>
                      <Text className="text-xs text-gray-500 text-center mt-1 px-4 leading-relaxed">
                        {requestFilter === 'PENDENTES'
                          ? 'Não há pedidos de ausência de professores aguardando aprovação.'
                          : requestFilter === 'APROVADOS'
                          ? 'Nenhuma ausência aprovada registrada no momento.'
                          : requestFilter === 'REPROVADOS'
                          ? 'Nenhuma ausência recusada registrada.'
                          : 'Quando um professor anexar um atestado médico, ele aparecerá aqui para visualização.'}
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-3">
                      {displayedRequests.map((req, idx) => {
                        const isProcessing = processingId === req.id;
                        const isPending = req.status === 'PENDENTE';
                        const isApproved = req.status === 'APROVADO';
                        const isRejected = req.status === 'REJEITADO';
                        const reasonText = REASON_LABELS[req.reason_type] || req.reason_type;

                        return (
                          <View
                            key={`${req.id || idx}-${idx}`}
                            className={`p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border ${
                              isApproved
                                ? 'border-emerald-300 dark:border-emerald-800/60'
                                : isRejected
                                ? 'border-rose-300 dark:border-rose-800/60'
                                : 'border-amber-300 dark:border-amber-800/60'
                            }`}
                          >
                            {/* Header do Card */}
                            <View className="flex-row justify-between items-start mb-2">
                              <View className="flex-1 pr-2">
                                <Text className="text-sm font-extrabold text-gray-800 dark:text-slate-100">
                                  {req.class?.subject || req.course_name || 'Aula'}
                                </Text>
                                <Text className="text-xs text-gray-600 dark:text-slate-300 font-semibold mt-0.5">
                                  Prof. {req.professor?.name || 'Não informado'}
                                </Text>
                                <Text className="text-[11px] text-gray-500 mt-0.5">
                                  Data da Falta: <Text className="font-bold text-sky-600">{formatDate(req.date)}</Text>
                                </Text>
                              </View>

                              <View className="items-end gap-1">
                                <View
                                  className={`px-2 py-0.5 rounded ${
                                    isApproved
                                      ? 'bg-emerald-100 dark:bg-emerald-950/40'
                                      : isRejected
                                      ? 'bg-rose-100 dark:bg-rose-950/40'
                                      : 'bg-amber-100 dark:bg-amber-950/40'
                                  }`}
                                >
                                  <Text
                                    className={`font-bold text-[10px] ${
                                      isApproved
                                        ? 'text-emerald-800 dark:text-emerald-300'
                                        : isRejected
                                        ? 'text-rose-800 dark:text-rose-300'
                                        : 'text-amber-800 dark:text-amber-300'
                                    }`}
                                  >
                                    {isApproved ? 'APROVADO' : isRejected ? 'RECUSADO' : 'PENDENTE'}
                                  </Text>
                                </View>

                                <View className="bg-gray-200 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  <Text className="text-gray-600 dark:text-slate-300 text-[9px] font-medium">
                                    {reasonText}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            {req.description && (
                              <Text className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 mb-2.5">
                                "{req.description}"
                              </Text>
                            )}

                            {/* Botão de Visualização de Atestado se houver */}
                            {req.certificate_url ? (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleOpenCertificate(req.certificate_url)}
                                className="flex-row items-center justify-between bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 p-2.5 rounded-xl mb-3 shadow-sm"
                              >
                                <View className="flex-row items-center flex-1 pr-2">
                                  <View className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 items-center justify-center mr-2.5">
                                    <Feather name="file-text" size={15} color="#0284c7" />
                                  </View>
                                  <View className="flex-1">
                                    <Text className="text-xs font-bold text-sky-900 dark:text-sky-200">
                                      Atestado Médico Anexado
                                    </Text>
                                    <Text className="text-[10px] text-sky-600 dark:text-sky-400">
                                      Toque para abrir e visualizar o documento
                                    </Text>
                                  </View>
                                </View>
                                <View className="bg-sky-500 px-2.5 py-1.5 rounded-lg flex-row items-center">
                                  <Feather name="external-link" size={11} color="#fff" style={{ marginRight: 4 }} />
                                  <Text className="text-white text-[11px] font-bold">Ver Atestado</Text>
                                </View>
                              </TouchableOpacity>
                            ) : req.reason_type === 'SAUDE' && isPending ? (
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

                            {/* Seção da Data de Reposição */}
                            <View className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-2.5 rounded-xl mb-3 flex-row items-center justify-between">
                              <View className="flex-1 pr-2">
                                <View className="flex-row items-center">
                                  <Feather
                                    name={req.replacement_date ? 'calendar' : 'clock'}
                                    size={12}
                                    color={req.replacement_date ? '#0284c7' : '#d97706'}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text
                                    className={`text-[11px] font-bold ${
                                      req.replacement_date ? 'text-sky-800 dark:text-sky-300' : 'text-amber-800 dark:text-amber-400'
                                    }`}
                                  >
                                    {req.replacement_date
                                      ? `Reposição: ${formatDateFriendly(req.replacement_date)}`
                                      : 'Reposição não agendada'}
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={() => setSchedulingCancellation(req)}
                                className="bg-sky-500 px-2.5 py-1 rounded-lg flex-row items-center"
                              >
                                <Feather name="calendar" size={11} color="#fff" />
                                <Text className="text-white text-[10px] font-bold ml-1">
                                  {req.replacement_date ? 'Alterar' : 'Agendar'}
                                </Text>
                              </TouchableOpacity>
                            </View>

                            {/* Ações de Aprovar / Rejeitar ou Status Concluído */}
                            {isPending ? (
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
                            ) : isApproved ? (
                              <View className="pt-2 border-t border-emerald-200 dark:border-emerald-900/40 flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                  <Feather name="check-circle" size={13} color="#10b981" />
                                  <Text className="text-emerald-700 dark:text-emerald-400 font-bold text-xs ml-1.5">
                                    Falta Aprovada pela Coordenação
                                  </Text>
                                </View>
                                {req.certificate_url && (
                                  <View className="bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded flex-row items-center">
                                    <Feather name="file-text" size={10} color="#0284c7" />
                                    <Text className="text-[10px] font-bold text-sky-700 dark:text-sky-300 ml-1">
                                      Com Atestado
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ) : (
                              <View className="pt-2 border-t border-rose-200 dark:border-rose-900/40 flex-row items-center">
                                <Feather name="x-circle" size={13} color="#ef4444" />
                                <Text className="text-rose-700 dark:text-rose-400 font-bold text-xs ml-1.5">
                                  Solicitação Recusada pela Coordenação
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              </View>
            );
          })()}

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
                  
                  {selectedClassId || selectedClassSubject ? (
                    <View className="bg-white dark:bg-slate-800 border border-sky-400 dark:border-sky-600 rounded-xl p-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 pr-2">
                          <View className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 items-center justify-center mr-2.5">
                            <Feather name="layers" size={16} color="#0ea5e9" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-xs font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>
                              {selectedClassSubject || directClassName}
                            </Text>
                            {availableClasses.find(c => c.id === selectedClassId)?.professor?.name ? (
                              <Text className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                Prof. {availableClasses.find(c => c.id === selectedClassId)?.professor?.name}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View className="w-5 h-5 rounded-full bg-emerald-500 items-center justify-center">
                          <Feather name="check" size={12} color="#fff" />
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedClassId('');
                          setSelectedClassSubject('');
                          setDirectClassName('');
                        }}
                        className="self-end px-2.5 py-1 rounded bg-gray-100 dark:bg-slate-700 flex-row items-center"
                      >
                        <Feather name="edit-2" size={12} color="#0ea5e9" />
                        <Text className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 ml-1">
                          Trocar Matéria
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      {/* Campo de Busca Rápida */}
                      <View className="flex-row items-center bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-xl px-3 py-2 mb-2">
                        <Feather name="search" size={15} color="#64748b" />
                        <TextInput
                          value={classSearch}
                          onChangeText={setClassSearch}
                          placeholder="Buscar matéria ou professor..."
                          placeholderTextColor="#94a3b8"
                          className="flex-1 text-xs font-semibold text-gray-800 dark:text-slate-100 ml-2"
                        />
                        {classSearch ? (
                          <TouchableOpacity onPress={() => setClassSearch('')}>
                            <Feather name="x-circle" size={15} color="#94a3b8" />
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Lista de sugestões / turmas filtradas */}
                      {loadingClasses ? (
                        <View className="py-4 items-center justify-center">
                          <ActivityIndicator size="small" color="#0ea5e9" />
                          <Text className="text-[11px] text-gray-500 mt-1">Carregando turmas cadastradas...</Text>
                        </View>
                      ) : (
                        <ScrollView
                          nestedScrollEnabled
                          style={{ maxHeight: 180 }}
                          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-1 mb-2"
                        >
                          {filteredClasses.length === 0 ? (
                            <View className="p-3 items-center">
                              <Text className="text-[11px] text-gray-500 dark:text-slate-400">
                                Nenhuma matéria encontrada com esse filtro.
                              </Text>
                            </View>
                          ) : (
                            filteredClasses.map((item) => (
                              <TouchableOpacity
                                key={item.id}
                                onPress={() => {
                                  setSelectedClassId(item.id);
                                  setSelectedClassSubject(item.subject);
                                  setDirectClassName(item.subject);
                                  setClassSearch('');
                                }}
                                className="p-2.5 rounded-lg border-b border-gray-100 dark:border-slate-700/60 active:bg-sky-50 dark:active:bg-sky-950/30 flex-row items-center justify-between"
                              >
                                <View className="flex-1 pr-2">
                                  <Text className="text-xs font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>
                                    {item.subject}
                                  </Text>
                                  {item.professor?.name && (
                                    <Text className="text-[11px] text-gray-500 dark:text-slate-400">
                                      Prof. {item.professor.name}
                                    </Text>
                                  )}
                                </View>
                                <Feather name="chevron-right" size={14} color="#94a3b8" />
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      )}

                      <Text className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 mb-1">
                        Ou digite o nome da matéria manualmente:
                      </Text>
                      <TextInput
                        value={directClassName}
                        onChangeText={(txt) => {
                          setDirectClassName(txt);
                          setSelectedClassSubject(txt);
                        }}
                        placeholder="Ex: Banco de Dados..."
                        placeholderTextColor="#94a3b8"
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 dark:text-slate-100"
                      />
                    </View>
                  )}
                </View>
              )}

              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase">
                  Data sem aula:
                </Text>
                <View className="flex-row gap-1">
                  <TouchableOpacity
                    onPress={() => setDirectDate(todayStr)}
                    className={`px-2.5 py-1 rounded-md ${
                      directDate === todayStr ? 'bg-sky-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    <Text className={`text-[11px] font-bold ${directDate === todayStr ? 'text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                      Hoje
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDirectDate(tomorrowStr)}
                    className={`px-2.5 py-1 rounded-md ${
                      directDate === tomorrowStr ? 'bg-sky-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    <Text className={`text-[11px] font-bold ${directDate === tomorrowStr ? 'text-white' : 'text-gray-700 dark:text-slate-300'}`}>
                      Amanhã
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

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
                      Toque para abrir calendário ({directDate})
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

    {/* Modal de Pré-visualização do Atestado Médico */}
    <Modal
      visible={!!previewCertificateUrl}
      transparent
      animationType="fade"
      onRequestClose={() => setPreviewCertificateUrl(null)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-lg items-center border border-gray-200 dark:border-slate-700 shadow-2xl">
          <View className="flex-row justify-between items-center w-full mb-3 pb-2 border-b border-gray-100 dark:border-slate-700">
            <View className="flex-row items-center">
              <Feather name="file-text" size={20} color="#0284c7" />
              <Text className="text-base font-bold text-gray-800 dark:text-slate-100 ml-2">
                Atestado Médico Anexado
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setPreviewCertificateUrl(null)}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-slate-700"
            >
              <Feather name="x" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {previewCertificateUrl ? (
            <Image
              source={{ uri: previewCertificateUrl }}
              style={{ width: '100%', height: 380, borderRadius: 12, resizeMode: 'contain' }}
            />
          ) : null}

          <TouchableOpacity
            onPress={() => {
              if (previewCertificateUrl) {
                if (Platform.OS === 'web') {
                  window.open(previewCertificateUrl, '_blank');
                } else {
                  Linking.openURL(previewCertificateUrl);
                }
              }
            }}
            className="mt-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-600 py-3 px-4 rounded-xl flex-row items-center justify-center w-full shadow-sm"
          >
            <Feather name="external-link" size={16} color="#fff" />
            <Text className="text-white font-bold text-xs ml-2">Abrir em Nova Aba / Download</Text>
          </TouchableOpacity>
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

    {/* Modal de Agendamento de Reposição */}
    <ScheduleReplacementModal
      visible={!!schedulingCancellation}
      cancellation={schedulingCancellation}
      userRole="COORDENADOR"
      onClose={() => setSchedulingCancellation(null)}
      onSuccess={() => {
        setSchedulingCancellation(null);
        loadRequests();
        if (onSuccess) onSuccess();
      }}
    />
  </>
);
}
