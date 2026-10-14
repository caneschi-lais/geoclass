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
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import ScheduleReplacementModal from './ScheduleReplacementModal';

interface ReplacementAttendanceModalProps {
  visible: boolean;
  userRole?: 'PROFESSOR' | 'COORDENADOR';
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplacementAttendanceModal({
  visible,
  userRole = 'PROFESSOR',
  onClose,
  onSuccess,
}: ReplacementAttendanceModalProps) {
  const [replacements, setReplacements] = useState<any[]>([]);
  const [selectedReplacement, setSelectedReplacement] = useState<any | null>(null);
  const [selectPickerVisible, setSelectPickerVisible] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schedulingCancellation, setSchedulingCancellation] = useState<any | null>(null);

  useEffect(() => {
    if (visible) {
      loadPendingReplacements();
    }
  }, [visible, userRole]);

  const loadPendingReplacements = async () => {
    setLoading(true);
    try {
      const endpoint = userRole === 'COORDENADOR'
        ? '/coordenador/reposicoes-pendentes'
        : '/professor/reposicoes-pendentes';

      const response = await api.get(endpoint);
      setReplacements(response.data);
      if (response.data.length > 0) {
        selectReplacementItem(response.data[0]);
      } else {
        setSelectedReplacement(null);
        setStudents([]);
        setCheckedStudentIds([]);
      }
    } catch (error) {
      console.error('Erro ao carregar reposições pendentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectReplacementItem = (rep: any) => {
    setSelectedReplacement(rep);
    if (userRole === 'COORDENADOR') {
      setStudents([]);
      setCheckedStudentIds([]);
      return;
    }
    const enrolledStudents = rep.class?.enrollments?.map((e: any) => e.student) || [];
    setStudents(enrolledStudents);
    // TODOS OS ALUNOS MARCADOS POR PADRÃO
    setCheckedStudentIds(enrolledStudents.map((s: any) => s.id));
  };

  const toggleStudent = (studentId: string) => {
    setCheckedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    setCheckedStudentIds(students.map((s) => s.id));
  };

  const handleDeselectAll = () => {
    setCheckedStudentIds([]);
  };

  const handleSubmit = async () => {
    if (!selectedReplacement) return;

    setSubmitting(true);
    try {
      await api.post(`/professor/reposicao/${selectedReplacement.id}/finalizar`, {
        attended_student_ids: checkedStudentIds,
      });

      const msg = 'Chamada de reposição concluída com sucesso! Presenças parciais convertidas.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sucesso', msg);

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao finalizar reposição:', error);
      const err = error.response?.data?.error || 'Erro ao finalizar chamada.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Erro', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = String(dateStr).split('T')[0];
      const parts = cleanStr.split('-').map(Number);
      if (parts.length === 3) {
        const day = String(parts[2]).padStart(2, '0');
        const month = String(parts[1]).padStart(2, '0');
        const year = parts[0];
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const getItemLabel = (rep: any) => {
    if (!rep) return 'Selecione uma aula...';
    const subject = rep.class?.subject || rep.course_name || 'Matéria';
    const dateFormatted = formatDate(rep.date);
    return `${subject} (${dateFormatted})`;
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
                  {userRole === 'COORDENADOR' ? 'Agendamento de Reposições' : 'Chamada de Reposição de Aula'}
                </Text>
                <Text className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  {userRole === 'COORDENADOR'
                    ? 'Defina ou altere a data de reposição das aulas pendentes'
                    : 'Desmarque os alunos que faltaram à reposição'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100 dark:bg-slate-700">
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text className="text-xs text-gray-500 mt-2 font-medium">Buscando reposições pendentes...</Text>
              </View>
            ) : replacements.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <Feather name="check-circle" size={40} color="#10b981" />
                <Text className="text-base font-bold text-gray-800 dark:text-slate-200 mt-3">
                  Nenhuma reposição pendente!
                </Text>
                <Text className="text-xs text-gray-500 text-center mt-1 px-4">
                  {userRole === 'COORDENADOR'
                    ? 'Todas as aulas pendentes da instituição já foram repostas ou agendadas.'
                    : 'Todas as suas aulas com falta já foram repostas ou não há ausências pendentes.'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
                {/* Seleção da aula a repor via SELECT DROPDOWN */}
                <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">
                  Selecione a Aula / Falta:
                </Text>

                {/* Botão de Select Dropdown Clicável */}
                <TouchableOpacity
                  onPress={() => setSelectPickerVisible(true)}
                  activeOpacity={0.7}
                  className="bg-gray-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700/70 p-3.5 rounded-2xl flex-row items-center justify-between mb-4 shadow-sm"
                >
                  <View className="flex-row items-center flex-1 pr-2">
                    <View className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 items-center justify-center mr-3">
                      <Feather name="book-open" size={17} color="#d97706" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold uppercase">
                        Matéria e Data sem aula:
                      </Text>
                      <Text numberOfLines={1} className="text-sm font-extrabold text-gray-800 dark:text-slate-100 mt-0.5">
                        {getItemLabel(selectedReplacement)}
                      </Text>
                      {selectedReplacement?.replacement_date ? (
                        <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                          ✓ Reposição agendada para: {formatDate(selectedReplacement.replacement_date)}
                        </Text>
                      ) : (
                        <Text className="text-[10px] text-amber-600 dark:text-amber-500 font-medium mt-0.5">
                          ⚠ Data da reposição ainda não definida
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="bg-amber-100 dark:bg-slate-800 p-2 rounded-xl">
                    <Feather name="chevron-down" size={18} color="#d97706" />
                  </View>
                </TouchableOpacity>

                {/* Card de Informação e Agendamento da Data de Reposição */}
                {selectedReplacement && (
                  <View className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 p-3.5 rounded-2xl mb-4 flex-row items-center justify-between shadow-sm">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center mb-0.5">
                        <Feather
                          name={selectedReplacement.replacement_date ? 'calendar' : 'clock'}
                          size={14}
                          color={selectedReplacement.replacement_date ? '#0284c7' : '#d97706'}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`text-xs font-bold ${
                            selectedReplacement.replacement_date
                              ? 'text-sky-900 dark:text-sky-200'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {selectedReplacement.replacement_date
                            ? `Data da Reposição: ${formatDate(selectedReplacement.replacement_date)}`
                            : 'Data de reposição não agendada'}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-gray-500 dark:text-slate-400">
                        Referente à ausência de {formatDate(selectedReplacement.date)}
                        {selectedReplacement.professor?.name ? ` • Prof. ${selectedReplacement.professor.name}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSchedulingCancellation(selectedReplacement)}
                      activeOpacity={0.8}
                      className="bg-sky-500 active:bg-sky-600 px-3.5 py-2 rounded-xl flex-row items-center shadow-sm"
                    >
                      <Feather name="calendar" size={13} color="#fff" />
                      <Text className="text-white text-xs font-bold ml-1.5">
                        {selectedReplacement.replacement_date ? 'Alterar' : 'Agendar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Se for COORDENADOR: Mostra apenas informativo; o registro de presença é restrito ao PROFESSOR */}
                {userRole === 'COORDENADOR' ? (
                  <View className="bg-sky-50/70 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 p-4 rounded-2xl mb-4">
                    <View className="flex-row items-center mb-1.5">
                      <Feather name="info" size={15} color="#0284c7" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-bold text-sky-900 dark:text-sky-200">
                        Registro de Presença da Reposição
                      </Text>
                    </View>
                    <Text className="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
                      A chamada dos alunos é de responsabilidade do professor da matéria no dia em que a aula de reposição for ministrada. O coordenador é responsável apenas pelo agendamento da data da reposição.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Informações e atalho de marcação de presença dos alunos (apenas para PROFESSOR) */}
                    <View className="flex-row justify-between items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 p-3 rounded-xl mb-3">
                      <View>
                        <Text className="text-xs font-extrabold text-amber-900 dark:text-amber-300">
                          Alunos Presentes na Reposição
                        </Text>
                        <Text className="text-[11px] text-amber-700 dark:text-amber-400">
                          {checkedStudentIds.length} de {students.length} presentes
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={handleSelectAll}
                          className="bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-amber-300"
                        >
                          <Text className="text-[11px] font-bold text-amber-700">Todos</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleDeselectAll}
                          className="bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-gray-300"
                        >
                          <Text className="text-[11px] font-bold text-gray-600">Nenhum</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Lista de alunos com checkboxes */}
                    <View className="gap-2 mb-4">
                      {students.map((student, idx) => {
                        const isChecked = checkedStudentIds.includes(student.id);
                        return (
                          <TouchableOpacity
                            key={`${student.id || idx}-${idx}`}
                            onPress={() => toggleStudent(student.id)}
                            className={`flex-row items-center justify-between p-3 rounded-xl border ${
                              isChecked
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/60'
                                : 'bg-red-50/70 dark:bg-red-950/20 border-red-300 dark:border-red-700/60'
                            }`}
                          >
                            <View className="flex-1 pr-2">
                              <Text className="text-sm font-bold text-gray-800 dark:text-slate-100">{student.name}</Text>
                              <Text className="text-xs text-gray-500 dark:text-slate-400">RA: {student.ra || 'N/A'}</Text>
                            </View>

                            <View className="flex-row items-center gap-2">
                              <Text
                                className={`text-xs font-extrabold ${
                                  isChecked ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                                }`}
                              >
                                {isChecked ? 'PRESENTE' : 'AUSENTE'}
                              </Text>
                              <View
                                className={`w-6 h-6 rounded-lg items-center justify-center border ${
                                  isChecked ? 'bg-emerald-500 border-emerald-600' : 'bg-white dark:bg-slate-800 border-red-400'
                                }`}
                              >
                                {isChecked && <Feather name="check" size={16} color="#fff" />}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* Ações */}
                <View className="flex-row gap-3 pb-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <TouchableOpacity
                    onPress={onClose}
                    disabled={submitting}
                    className="flex-1 bg-gray-100 dark:bg-slate-700 py-3.5 rounded-xl items-center"
                  >
                    <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase">Fechar</Text>
                  </TouchableOpacity>

                  {userRole === 'COORDENADOR' ? (
                    selectedReplacement && (
                      <TouchableOpacity
                        onPress={() => setSchedulingCancellation(selectedReplacement)}
                        className="flex-1 bg-sky-500 active:bg-sky-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm"
                      >
                        <Feather name="calendar" size={15} color="#fff" style={{ marginRight: 6 }} />
                        <Text className="text-white font-bold text-xs uppercase ml-1.5">
                          {selectedReplacement.replacement_date ? 'Alterar Data' : 'Agendar Data'}
                        </Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={submitting || students.length === 0}
                      className="flex-1 bg-amber-500 active:bg-amber-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm"
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Feather name="check-square" size={15} color="#fff" style={{ marginRight: 6 }} />
                          <Text className="text-white font-bold text-xs uppercase ml-1.5">Concluir Chamada</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Dropdown do Select de Aulas */}
      <Modal
        visible={selectPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectPickerVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: 20,
          }}
        >
          <View
            style={{
              elevation: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 20,
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-5 w-full max-w-md max-h-[80%] border border-gray-200 dark:border-slate-700"
          >
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-700 mb-3">
              <View>
                <Text className="text-base font-extrabold text-gray-800 dark:text-slate-100">
                  Selecionar Aula / Falta
                </Text>
                <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {userRole === 'COORDENADOR' ? 'Todas as aulas da instituição' : 'Apenas suas matérias'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectPickerVisible(false)}
                className="p-1 rounded-full bg-gray-100 dark:bg-slate-700"
              >
                <Feather name="x" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={replacements}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedReplacement?.id === item.id;
                const label = getItemLabel(item);
                const profName = item.professor?.name || item.class?.professor?.name;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      selectReplacementItem(item);
                      setSelectPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                    className={`p-3.5 rounded-2xl mb-2.5 border flex-row items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className={`text-sm font-bold ${
                          isSelected ? 'text-amber-900 dark:text-amber-200' : 'text-gray-800 dark:text-slate-100'
                        }`}
                      >
                        {label}
                      </Text>

                      {userRole === 'COORDENADOR' && profName ? (
                        <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          Prof. {profName}
                        </Text>
                      ) : null}

                      <View className="flex-row items-center mt-1.5 gap-2">
                        {item.replacement_date ? (
                          <View className="bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-extrabold text-emerald-800 dark:text-emerald-300">
                              Reposição: {formatDate(item.replacement_date)}
                            </Text>
                          </View>
                        ) : (
                          <View className="bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300">
                              Data Pendente
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border ${
                        isSelected
                          ? 'bg-amber-500 border-amber-600'
                          : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Feather name="check" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Agendamento da Reposição com o Input de Calendário */}
      <ScheduleReplacementModal
        visible={!!schedulingCancellation}
        cancellation={schedulingCancellation}
        userRole={userRole}
        onClose={() => setSchedulingCancellation(null)}
        onSuccess={() => {
          setSchedulingCancellation(null);
          loadPendingReplacements();
          if (onSuccess) onSuccess();
        }}
      />
    </>
  );
}
