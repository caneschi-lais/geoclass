import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import { ExportService } from '../../services/ExportService';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';

type SubjectData = {
  classId: string;
  subject: string;
  room_name: string;
  total_classes: number;
  absencePercentage: number;
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

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      if (format === 'excel') {
        const excelData = subjects.map(s => ({
          'Matéria': s.subject,
          'Sala': s.room_name,
          'Aulas Previstas': s.total_classes,
          'Faltas (%)': s.absencePercentage
        }));
        await ExportService.exportToExcel(excelData, `Relatorio_Materias_${studentName.replace(/\s+/g, '_')}`);
      } else {
        const headers = ['Matéria', 'Sala', 'Aulas Previstas', 'Faltas (%)'];
        const rows = subjects.map(s => {
          const percHtml = s.absencePercentage >= 25 ? `<span class="high-absence">${s.absencePercentage}%</span>` : `${s.absencePercentage}%`;
          return [s.subject, s.room_name, s.total_classes.toString(), percHtml];
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
    <View className="bg-white p-4 rounded-xl mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start justify-between border-b border-gray-100 pb-3 mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-gray-800">{item.subject}</Text>
          <View className="flex-row items-center mt-2">
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text className="text-gray-500 ml-1 font-medium">{item.room_name}</Text>
          </View>
        </View>

        <View className="items-end bg-gray-50 p-2 rounded-lg">
          <Text className="text-xs text-gray-400 mb-1">Aulas Previstas</Text>
          <Text className="text-md font-bold text-gray-700">{item.total_classes}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-gray-600 font-medium">Índice de Faltas</Text>
        <Text className={`text-xl font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.absencePercentage}%
        </Text>
      </View>

      {/* Barra de Progresso Visual */}
      <View className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden flex-row">
        <View
          className="h-full bg-emerald-400"
          style={{ width: `${100 - item.absencePercentage}%` }}
        />
        <View
          className="h-full bg-red-400"
          style={{ width: `${item.absencePercentage}%` }}
        />
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay message="Carregando matérias..." />;

  return (
    <View className="flex-1 bg-gray-50 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}
      <ScreenHeader
        title="Detalhes do Aluno"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          label: 'Exportar',
          onPress: () => setExportModalVisible(true),
          variant: 'info'
        }}
      />

      <View className="mb-6">
        <Text className="text-sm text-gray-500 uppercase tracking-wider font-bold mb-1">Aluno</Text>
        <Text className="text-xl font-black text-gray-800">{studentName}</Text>
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
    </View>
  );
}
