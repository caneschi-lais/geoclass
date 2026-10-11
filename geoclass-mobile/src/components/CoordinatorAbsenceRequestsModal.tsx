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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface CoordinatorAbsenceRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
}: CoordinatorAbsenceRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'DIRECT'>('REQUESTS');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Formulário de Cancelamento Direto
  const todayStr = new Date().toISOString().split('T')[0];
  const [directScope, setDirectScope] = useState<'INSTITUICAO' | 'CURSO' | 'TURMA'>('INSTITUICAO');
  const [directDate, setDirectDate] = useState(todayStr);
  const [directReason, setDirectReason] = useState('MANUTENCAO');
  const [directDescription, setDirectDescription] = useState('');
  const [directReplacementDate, setDirectReplacementDate] = useState('');
  const [directLoading, setDirectLoading] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'REQUESTS') {
      loadRequests();
    }
  }, [visible, activeTab]);

  const loadRequests = async () => {
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

    setDirectLoading(true);
    try {
      await api.post('/coordenador/cancelar-aulas', {
        scope: directScope,
        date: directDate,
        reason_type: directReason,
        description: directDescription,
        replacement_date: directReplacementDate || undefined,
      });

      const msg = 'Suspensão de aulas registrada! Professores e alunos notificados com sucesso.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sucesso', msg);

      setDirectDescription('');
      setDirectReplacementDate('');
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/60 p-4">
        <View className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[90%] shadow-2xl border border-gray-150 dark:border-slate-700">
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
                activeTab === 'REQUESTS' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''
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
                activeTab === 'DIRECT' ? 'bg-white dark:bg-slate-800 shadow-sm' : ''
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
                          <Text className="text-xs text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-150 dark:border-slate-700 mb-2.5">
                            "{req.description}"
                          </Text>
                        )}

                        {/* Botão para visualizar atestado se houver */}
                        {req.certificate_url ? (
                          <TouchableOpacity
                            onPress={() => handleOpenCertificate(req.certificate_url)}
                            className="flex-row items-center justify-center bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 p-2 rounded-lg mb-3"
                          >
                            <Feather name="file-text" size={14} color="#0ea5e9" className="mr-1.5" />
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
                            <Feather name="bell" size={14} color="#d97706" className="mr-1.5" />
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
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 py-2.5 rounded-xl items-center flex-row justify-center shadow-sm"
                          >
                            {isProcessing ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Feather name="check" size={14} color="#fff" className="mr-1" />
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
              <View className="flex-row gap-2 mb-4">
                {[
                  { key: 'INSTITUICAO', label: 'Toda Instituição' },
                  { key: 'CURSO', label: 'Por Curso' },
                  { key: 'TURMA', label: 'Por Turma' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    onPress={() => setDirectScope(s.key as any)}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      directScope === s.key
                        ? 'bg-sky-500 border-sky-600'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        directScope === s.key ? 'text-white' : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Data sem aula (AAAA-MM-DD):
              </Text>
              <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 mb-4">
                <Feather name="calendar" size={16} color="#0ea5e9" className="mr-2" />
                <TextInput
                  value={directDate}
                  onChangeText={setDirectDate}
                  placeholder="Ex: 2026-10-28"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100 ml-2"
                />
              </View>

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
              <View className="flex-row items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 mb-6">
                <Feather name="clock" size={16} color="#64748b" className="mr-2" />
                <TextInput
                  value={directReplacementDate}
                  onChangeText={setDirectReplacementDate}
                  placeholder="Ex: 2026-11-07"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 text-sm font-semibold text-gray-800 dark:text-slate-100 ml-2"
                />
              </View>

              <TouchableOpacity
                onPress={handleDirectCancellation}
                disabled={directLoading}
                className="bg-sky-500 hover:bg-sky-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-md shadow-sky-500/20 mb-2"
              >
                {directLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="alert-triangle" size={16} color="#fff" className="mr-1.5" />
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
  );
}
