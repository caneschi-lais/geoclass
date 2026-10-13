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

interface ReplacementAttendanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplacementAttendanceModal({
  visible,
  onClose,
  onSuccess,
}: ReplacementAttendanceModalProps) {
  const [replacements, setReplacements] = useState<any[]>([]);
  const [selectedReplacement, setSelectedReplacement] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  // IMPORTANTE: Conforme requisito do usuário, todos vêm pré-marcados!
  const [checkedStudentIds, setCheckedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPendingReplacements();
    }
  }, [visible]);

  const loadPendingReplacements = async () => {
    setLoading(true);
    try {
      const response = await api.get('/professor/reposicoes-pendentes');
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
    const enrolledStudents = rep.class?.enrollments?.map((e: any) => e.student) || [];
    setStudents(enrolledStudents);
    // TODOS OS ALUNOS MARCADOS POR PADRÃO!
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
    const d = new Date(dateStr);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  if (!visible) return null;

  return (
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
                Chamada de Reposição de Aula
              </Text>
              <Text className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                Desmarque os alunos que faltaram à reposição
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
                Todas as faltas já foram repostas ou não há registros aprovados para reposição.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
              {/* Seleção da aula a repor */}
              <Text className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase mb-1.5">
                Selecione a Aula / Falta:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  {replacements.map((rep) => {
                    const isSelected = selectedReplacement?.id === rep.id;
                    return (
                      <TouchableOpacity
                        key={rep.id}
                        onPress={() => selectReplacementItem(rep)}
                        className={`p-3 rounded-xl border ${
                          isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                            : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700'
                        }`}
                      >
                        <Text
                          className={`text-xs font-extrabold ${
                            isSelected ? 'text-amber-800 dark:text-amber-300' : 'text-gray-800 dark:text-slate-200'
                          }`}
                        >
                          {rep.class?.subject}
                        </Text>
                        <Text className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                          Falta: {formatDate(rep.date)}
                        </Text>
                        {rep.replacement_date && (
                          <Text className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                            Data rep.: {formatDate(rep.replacement_date)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Informações e atalho de marcação */}
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
                    className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-amber-300"
                  >
                    <Text className="text-[10px] font-bold text-amber-700">Todos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeselectAll}
                    className="bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-300"
                  >
                    <Text className="text-[10px] font-bold text-gray-600">Nenhum</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lista de alunos com checkboxes */}
              <View className="gap-2 mb-4">
                {students.map((student) => {
                  const isChecked = checkedStudentIds.includes(student.id);
                  return (
                    <TouchableOpacity
                      key={student.id}
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

              {/* Ações */}
              <View className="flex-row gap-3 pb-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                <TouchableOpacity
                  onPress={onClose}
                  disabled={submitting}
                  className="flex-1 bg-gray-100 dark:bg-slate-700 py-3.5 rounded-xl items-center"
                >
                  <Text className="text-gray-700 dark:text-slate-300 font-bold text-xs uppercase">Fechar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || students.length === 0}
                  className="flex-1 bg-amber-500 active:bg-amber-600 py-3.5 rounded-xl items-center flex-row justify-center"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Feather name="check-square" size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text className="text-white font-bold text-xs uppercase ml-1.5">Concluir Chamada</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
