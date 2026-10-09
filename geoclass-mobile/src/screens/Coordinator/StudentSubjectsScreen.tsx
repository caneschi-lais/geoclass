import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import { ExportService } from '../../services/ExportService';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import HoldButton from '../../components/HoldButton';

type SubjectData = {
  classId: string;
  subject: string;
  room_name: string;
  total_classes: number;
  absencePercentage: number;
  is_completed?: boolean;
};

type Props = {
  navigation: any;
  route: any;
};

export default function StudentSubjectsScreen({ navigation, route }: Props) {
  const { studentId, studentName, semesterId } = route.params;
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    classId: string;
    subjectName: string;
    isCompleted: boolean;
  }>({
    visible: false,
    classId: '',
    subjectName: '',
    isCompleted: false,
  });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, [studentId, semesterId]);

  const loadSubjects = async () => {
    try {
      const response = await api.get(`/coordenador/aluno/${studentId}/materias?semester=${semesterId}`);
      setSubjects(response.data);
    } catch (error) {
      console.log('Error loading student subjects', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfirmModal = (item: SubjectData) => {
    setConfirmModal({
      visible: true,
      classId: item.classId,
      subjectName: item.subject,
      isCompleted: !!item.is_completed,
    });
  };

  const handleConfirmToggleSubject = async () => {
    if (!confirmModal.classId) return;
    setActionLoading(true);
    try {
      const newStatus = !confirmModal.isCompleted;
      const response = await api.put('/coordenador/aluno/materia-status', {
        studentId,
        classId: confirmModal.classId,
        is_completed: newStatus
      });

      setSubjects(prev =>
        prev.map(s => s.classId === confirmModal.classId ? { ...s, is_completed: newStatus } : s)
      );

      const msg = response.data?.message || 'Status da matéria atualizado!';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Sucesso', msg);
      }
    } catch (error: any) {
      console.log('Error toggling subject completion:', error);
      const errMsg = error.response?.data?.error || 'Não foi possível alterar o status da matéria.';
      if (Platform.OS === 'web') {
        window.alert(`Erro: ${errMsg}`);
      } else {
        Alert.alert('Erro', errMsg);
      }
    } finally {
      setActionLoading(false);
      setConfirmModal(prev => ({ ...prev, visible: false }));
    }
  };

  const showHoldHint = (isCompleted: boolean) => {
    const action = isCompleted ? 'reabrir a matéria' : 'concluir a matéria';
    const msg = `Mantenha o botão pressionado por 1 segundo para ${action}.`;
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Instrução', msg);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (format === 'excel') {
        const excelData = subjects.map(s => ({
          'Matéria': s.subject,
          'Sala': s.room_name,
          'Aulas Previstas': s.total_classes,
          'Faltas (%)': s.absencePercentage,
          'Status': s.is_completed ? 'Concluída (Modo Leitura)' : 'Em Andamento'
        }));
        await ExportService.exportToExcel(excelData, `Relatorio_Materias_${studentName.replace(/\s+/g, '_')}`);
      } else {
        const headers = ['Matéria', 'Sala', 'Aulas Previstas', 'Faltas (%)', 'Status'];
        const rows = subjects.map(s => {
          const percHtml = s.absencePercentage >= 25 ? `<span class="high-absence">${s.absencePercentage}%</span>` : `${s.absencePercentage}%`;
          const statusText = s.is_completed ? 'Concluída' : 'Em Andamento';
          return [s.subject, s.room_name, s.total_classes.toString(), percHtml, statusText];
        });

        // Gráfico com as matérias com mais faltas
        const chartData = [...subjects]
          .sort((a, b) => b.absencePercentage - a.absencePercentage)
          .map(s => ({
            label: s.subject,
            value: s.absencePercentage
          }));

        const html = ExportService.generateHTMLTable(`Relatório do Aluno: ${studentName}`, headers, rows, chartData);
        await ExportService.exportToPDF(html, `Relatorio_Materias_${studentName.replace(/\s+/g, '_')}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao exportar relatório.');
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item }: { item: SubjectData }) => (
    <View className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <View className="flex-row items-start justify-between border-b border-gray-100 dark:border-slate-700 pb-3 mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">{item.subject}</Text>
          <View className="flex-row items-center mt-2">
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text className="text-gray-500 dark:text-slate-400 ml-1 font-medium">{item.room_name}</Text>
          </View>
        </View>

        <View className="items-end bg-gray-50 dark:bg-slate-900 p-2 rounded-lg">
          <Text className="text-xs text-gray-400 mb-1">Aulas Previstas</Text>
          <Text className="text-md font-bold text-gray-700 dark:text-slate-200">{item.total_classes}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-gray-600 dark:text-slate-300 font-medium">Índice de Faltas</Text>
        <Text className={`text-xl font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.absencePercentage}%
        </Text>
      </View>
      <View className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden flex-row">
        <View
          className="h-full bg-emerald-400"
          style={{ width: `${100 - item.absencePercentage}%` }}
        />
        <View
          className="h-full bg-red-400"
          style={{ width: `${item.absencePercentage}%` }}
        />
      </View>

      {/* Ação do Coordenador: Alternar Conclusão da Matéria (Exige segurar 1s) */}
      <View className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex-row justify-between items-center">
        <View className="flex-row items-center gap-1.5 flex-1 pr-2">
          <Feather
            name={item.is_completed ? "check-circle" : "clock"}
            size={16}
            color={item.is_completed ? "#d97706" : "#64748b"}
          />
          <Text className={`text-xs font-bold ${item.is_completed ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {item.is_completed ? 'Concluída (Modo Leitura)' : 'Em Andamento'}
          </Text>
        </View>

        <HoldButton
          onHoldSuccess={() => handleOpenConfirmModal(item)}
          hintActionText={item.is_completed ? 'reabrir a matéria' : 'concluir a matéria'}
          className={`px-3 py-2 rounded-lg flex-row items-center gap-1 border shadow-xs ${
            item.is_completed
              ? 'bg-gray-100 border-gray-300 dark:bg-slate-700 dark:border-slate-600'
              : 'bg-amber-500 border-amber-600 active:bg-amber-600'
          }`}
        >
          <Feather name={item.is_completed ? "rotate-ccw" : "check"} size={14} color={item.is_completed ? "#475569" : "#ffffff"} />
          <Text className={`text-xs font-bold ${item.is_completed ? 'text-slate-700 dark:text-slate-200' : 'text-white'}`}>
            {item.is_completed ? 'Reabrir (Segure 1s)' : 'Marcar Concluída (Segure 1s)'}
          </Text>
        </HoldButton>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay message="Carregando matérias..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}
      <ScreenHeader
        title="Detalhes"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          label: 'Exportar',
          onPress: () => setExportModalVisible(true),
          variant: 'info'
        }}
      />

      <View className="mb-6">
        <Text className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider font-bold mb-1">Aluno</Text>
        <Text className="text-xl font-black text-gray-800 dark:text-slate-100">{studentName}</Text>
        <Text className="text-sky-600 font-medium mt-1">Semestre {semesterId}</Text>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item.classId}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message="Nenhuma matéria encontrada." />}
      />

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={(format) => handleExport(format)}
        showDetailsOption={false}
        title="Exportar Matérias"
      />

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.isCompleted ? 'Reabrir Matéria' : 'Concluir Matéria'}
        message={
          confirmModal.isCompleted
            ? `Tem certeza que deseja reabrir a matéria "${confirmModal.subjectName}" para o aluno ${studentName}? Ele voltará a poder registrar presenças.`
            : `Tem certeza que deseja marcar a matéria "${confirmModal.subjectName}" como CONCLUÍDA para o aluno ${studentName}? A matéria entrará em Modo Leitura.`
        }
        confirmText={confirmModal.isCompleted ? 'Reabrir Matéria' : 'Marcar Concluída'}
        confirmVariant={confirmModal.isCompleted ? 'warning' : 'success'}
        onConfirm={handleConfirmToggleSubject}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        loading={actionLoading}
      />
    </View>
  );
}
