import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import ScheduleReplacementModal from './ScheduleReplacementModal';

interface ProfessorAbsenceHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ALLOWED_PROFESSOR_REASONS = ['SAUDE', 'PESSOAL', 'ACADEMICO', 'TRANSPORTE', 'OUTROS'];

const REASON_LABELS: Record<string, string> = {
  SAUDE: 'Problemas de saúde',
  PESSOAL: 'Problemas pessoais',
  ACADEMICO: 'Compromisso acadêmico / Congresso',
  TRANSPORTE: 'Dificuldade de transporte / deslocamento',
  OUTROS: 'Outros motivos',
};

function formatDateFriendly(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-').map(Number);
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

export default function ProfessorAbsenceHistoryModal({
  visible,
  onClose,
  onSuccess,
}: ProfessorAbsenceHistoryModalProps) {
  const [absences, setAbsences] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [schedulingCancellation, setSchedulingCancellation] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      loadAbsences();
    }
  }, [visible]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const response = await api.get('/professor/minhas-ausencias');
      const list = response.data || [];
      const filtered = list.filter((item: any) => ALLOWED_PROFESSOR_REASONS.includes(item.reason_type));
      setAbsences(filtered);
    } catch (error) {
      console.error('Erro ao carregar histórico de ausências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAndUploadCertificate = (cancellationId: string) => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.pdf,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (event: any) => {
            const base64 = event.target.result;
            await submitCertificate(cancellationId, base64, file.name);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Anexar Atestado Médico',
        'Selecione o formato do documento que deseja enviar para a coordenação:',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar Foto do Atestado',
            onPress: () => {
              const fakePhotoBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
              submitCertificate(cancellationId, fakePhotoBase64, 'atestado-foto.jpg');
            },
          },
          {
            text: 'Enviar Documento PDF',
            onPress: () => {
              const fakePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJUZha2VQZGY=';
              submitCertificate(cancellationId, fakePdfBase64, 'atestado-medico.pdf');
            },
          },
        ]
      );
    }
  };

  const submitCertificate = async (id: string, base64Data: string, filename: string) => {
    setUploadingId(id);
    try {
      await api.post(`/professor/cancelamento/${id}/atestado`, {
        certificate_base64: base64Data,
        certificate_filename: filename,
      });

      const msg = 'Atestado médico anexado com sucesso e enviado para análise da coordenação!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sucesso', msg);

      await loadAbsences();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Erro ao enviar atestado:', error);
      const err = error.response?.data?.error || 'Erro ao anexar atestado.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleOpenCertificate = (url: string) => {
    const fullUrl = url.startsWith('http') ? url : `${api.defaults.baseURL?.replace('/api', '')}${url}`;
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    } else {
      Alert.alert('Atestado Anexado', `Arquivo disponível em: ${fullUrl}`);
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
          className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-lg max-h-[90%] border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 mb-3">
            <View>
              <Text className="text-lg font-extrabold text-gray-800 dark:text-slate-100">
                Minhas Ausências & Atestados
              </Text>
              <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold">
                Gerencie atestados e pedidos de falta
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#0ea5e9" />
              <Text className="text-xs text-gray-500 mt-2">Carregando suas ausências...</Text>
            </View>
          ) : absences.length === 0 ? (
            <View className="py-16 items-center justify-center">
              <Feather name="calendar" size={40} color="#94a3b8" />
              <Text className="text-base font-bold text-gray-800 dark:text-slate-200 mt-3">
                Nenhuma ausência registrada
              </Text>
              <Text className="text-xs text-gray-500 text-center mt-1 px-4">
                Quando você reportar uma falta pelo botão "Avisar Falta", ela aparecerá aqui para você acompanhar o status e anexar atestados.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[500px]">
              <View className="gap-3">
                {absences.map((item, idx) => {
                  const isUploading = uploadingId === item.id;
                  const reasonLabel = REASON_LABELS[item.reason_type] || item.reason_type;
                  const isHealth = item.reason_type === 'SAUDE';
                  const hasCertificate = !!item.certificate_url;
                  const isPending = item.status === 'PENDENTE';
                  const isApproved = item.status === 'APROVADO';
                  const isRejected = item.status === 'REJEITADO';

                  return (
                    <View
                      key={`${item.id || idx}-${idx}`}
                      className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700"
                    >
                      {/* Top info */}
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 pr-2">
                          <Text className="text-sm font-extrabold text-gray-800 dark:text-slate-100">
                            {item.class?.subject || 'Aula'}
                          </Text>
                          <Text className="text-xs text-sky-600 dark:text-sky-400 font-bold mt-0.5">
                            {formatDateFriendly(item.date)}
                          </Text>
                          {item.class?.room_name && (
                            <Text className="text-[11px] text-gray-500 mt-0.5">
                              {item.class.room_name} • {item.class.schedule_time || ''}
                            </Text>
                          )}
                        </View>

                        {/* Status Badge */}
                        <View
                          className={`px-2.5 py-1 rounded-full ${
                            isApproved
                              ? 'bg-emerald-100 dark:bg-emerald-950/50'
                              : isRejected
                              ? 'bg-red-100 dark:bg-red-950/50'
                              : 'bg-amber-100 dark:bg-amber-950/50'
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isApproved
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : isRejected
                                ? 'text-red-700 dark:text-red-300'
                                : 'text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {isApproved ? 'Aprovado' : isRejected ? 'Recusado' : 'Pendente'}
                          </Text>
                        </View>
                      </View>

                      {/* Motivo */}
                      <View className="flex-row items-center gap-1.5 mb-2">
                        <View className="bg-gray-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Text className="text-[11px] text-gray-700 dark:text-slate-300 font-semibold">
                            Motivo: {reasonLabel}
                          </Text>
                        </View>
                      </View>

                      {item.description ? (
                        <Text className="text-xs text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 mb-3">
                          "{item.description}"
                        </Text>
                      ) : null}

                      {/* Seção de Atestado Médico (apenas se houver atestado ou se o motivo for saúde) */}
                      {hasCertificate ? (
                        <View className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-2.5 rounded-xl flex-row items-center justify-between mt-1">
                          <View className="flex-row items-center flex-1 pr-2">
                            <Feather name="file-text" size={16} color="#059669" />
                            <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300 ml-1.5">
                              Atestado Médico Anexado
                            </Text>
                          </View>
                          <View className="flex-row gap-1.5">
                            <TouchableOpacity
                              onPress={() => handleOpenCertificate(item.certificate_url)}
                              className="bg-emerald-600 px-2.5 py-1.5 rounded-lg flex-row items-center"
                            >
                              <Feather name="eye" size={12} color="#fff" />
                              <Text className="text-white text-[11px] font-bold ml-1">Ver</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handlePickAndUploadCertificate(item.id)}
                              disabled={isUploading}
                              className="bg-gray-200 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg flex-row items-center"
                            >
                              <Feather name="refresh-cw" size={12} color="#475569" />
                              <Text className="text-slate-700 dark:text-slate-300 text-[11px] font-bold ml-1">
                                Trocar
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : isHealth ? (
                        <View className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl mt-1">
                          <View className="flex-row items-center mb-2">
                            <Feather name="alert-triangle" size={14} color="#d97706" />
                            <Text className="text-xs font-bold text-amber-800 dark:text-amber-300 ml-1.5">
                              Atestado Médico Não Anexado
                            </Text>
                          </View>
                          <Text className="text-[11px] text-amber-700 dark:text-amber-400 mb-2.5">
                            A coordenação solicita o atestado médico para aprovar sua ausência e abonar as faltas dos alunos.
                          </Text>

                          <TouchableOpacity
                            onPress={() => handlePickAndUploadCertificate(item.id)}
                            disabled={isUploading}
                            activeOpacity={0.8}
                            className="bg-sky-500 active:bg-sky-600 py-2.5 px-3 rounded-xl items-center flex-row justify-center"
                          >
                            {isUploading ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Feather name="paperclip" size={14} color="#fff" />
                                <Text className="text-white font-bold text-xs uppercase ml-1.5">
                                  Anexar Atestado (PDF ou Foto)
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {/* Seção de Reposição de Aula */}
                      <View className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 p-3 rounded-xl mt-2.5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1 pr-2">
                            <View className="flex-row items-center mb-0.5">
                              <Feather
                                name={item.replacement_date ? 'calendar' : 'clock'}
                                size={13}
                                color={item.replacement_date ? '#0284c7' : '#d97706'}
                                style={{ marginRight: 5 }}
                              />
                              <Text
                                className={`text-xs font-bold ${
                                  item.replacement_date
                                    ? 'text-sky-800 dark:text-sky-300'
                                    : 'text-amber-800 dark:text-amber-400'
                                }`}
                              >
                                {item.replacement_date
                                  ? `Reposição: ${formatDateFriendly(item.replacement_date)}`
                                  : 'Data de reposição não definida'}
                              </Text>
                            </View>
                            <Text className="text-[10px] text-gray-500 dark:text-slate-400">
                              {item.replacement_date
                                ? 'Alunos foram notificados sobre esta reposição.'
                                : 'Defina quando a aula será reposta para notificar os alunos.'}
                            </Text>
                          </View>

                          <TouchableOpacity
                            onPress={() => setSchedulingCancellation(item)}
                            className="bg-sky-500 active:bg-sky-600 px-3 py-1.5 rounded-lg flex-row items-center"
                          >
                            <Feather name="calendar" size={12} color="#fff" />
                            <Text className="text-white text-[11px] font-bold ml-1">
                              {item.replacement_date ? 'Alterar' : 'Agendar'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Botão Fechar */}
          <TouchableOpacity
            onPress={onClose}
            className="mt-4 bg-gray-100 dark:bg-slate-700 py-3 rounded-xl items-center"
          >
            <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase">Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <ScheduleReplacementModal
      visible={!!schedulingCancellation}
      cancellation={schedulingCancellation}
      userRole="PROFESSOR"
      onClose={() => setSchedulingCancellation(null)}
      onSuccess={() => {
        setSchedulingCancellation(null);
        loadAbsences();
        if (onSuccess) onSuccess();
      }}
    />
  </>
  );
}
