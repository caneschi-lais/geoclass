import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import { ExportService } from '../../services/ExportService';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';

type StudentData = {
  id: string;
  name: string;
  ra: string;
  absencePercentage: number;
};

type Props = {
  navigation: any;
  route: any;
};

export default function StudentsListScreen({ navigation, route }: Props) {
  const { semesterId } = route.params;
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [semesterId]);

  const loadStudents = async () => {
    try {
      const response = await api.get(`/coordenador/semestre/${semesterId}/alunos`);
      setStudents(response.data);
      setFilteredStudents(response.data);
    } catch (error) {
      console.log('Error loading students', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(
        s => s.ra.toLowerCase().includes(text.toLowerCase()) || 
             s.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel', includeDetails: boolean) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const response = await api.get(`/coordenador/relatorio?level=students&semesterId=${semesterId}&includeDetails=${includeDetails}`);
      const data = response.data;
      
      if (format === 'excel') {
        let excelData: any[] = [];
        data.forEach((s: any) => {
          excelData.push({ 'RA': s.ra, 'Nome': s.name, 'Faltas (%)': s.absencePercentage, 'Matéria': '', 'Sala': '' });
          if (includeDetails && s.details) {
            s.details.forEach((d: any) => {
              excelData.push({ 'RA': '', 'Nome': '', 'Faltas (%)': d.absencePercentage, 'Matéria': d.subject, 'Sala': d.room_name });
            });
          }
        });
        await ExportService.exportToExcel(excelData, `Relatorio_Alunos_${semesterId}`);
      } else {
        const headers = includeDetails ? ['Aluno', 'RA', 'Faltas (%)', 'Matérias'] : ['Aluno', 'RA', 'Faltas (%)'];
        let rows: any[] = [];
        data.forEach((s: any) => {
          const sPercHtml = s.absencePercentage >= 25 ? `<span class="high-absence">${s.absencePercentage}%</span>` : `${s.absencePercentage}%`;
          if (!includeDetails) {
            rows.push([s.name, s.ra, sPercHtml]);
          } else {
            rows.push([`<strong style="color:#0ea5e9">${s.name}</strong>`, s.ra, `<strong>${sPercHtml}</strong>`, '']);
            if (s.details) {
              s.details.forEach((d: any) => {
                const dPercHtml = d.absencePercentage >= 25 ? `<span class="high-absence">${d.absencePercentage}%</span>` : `${d.absencePercentage}%`;
                rows.push(['', '', dPercHtml, `${d.subject} (${d.room_name})`]);
              });
            }
          }
        });
        
        // Criando dados para o gráfico (Top 5 alunos com mais faltas)
        const sortedData = [...data].sort((a: any, b: any) => b.absencePercentage - a.absencePercentage).slice(0, 5);
        let chartData: {label: string, value: number}[] = sortedData.map((s: any) => ({
          label: s.name,
          value: s.absencePercentage
        }));

        const html = ExportService.generateHTMLTable(`Relatório de Alunos - ${semesterId}`, headers, rows, chartData);
        await ExportService.exportToPDF(html, `Relatorio_Alunos_${semesterId}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao exportar relatório.');
    } finally {
      setExporting(false);
    }
  };

  const renderItem = ({ item }: { item: StudentData }) => (
    <TouchableOpacity 
      className="bg-white p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border border-gray-100"
      onPress={() => navigation.navigate('StudentSubjects', { 
        studentId: item.id, 
        studentName: item.name,
        semesterId 
      })}
    >
      <View className="flex-row items-center flex-1">
        <View className={`p-3 rounded-full mr-4 ${item.absencePercentage >= 25 ? 'bg-red-100' : 'bg-emerald-100'}`}>
          <Feather name="user" size={24} color={item.absencePercentage >= 25 ? '#ef4444' : '#10b981'} />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>{item.name}</Text>
          <Text className="text-gray-500 mt-1">RA: {item.ra}</Text>
        </View>
      </View>
      
      <View className="items-end">
        <Text className="text-xs text-gray-400 mb-1">Faltas Totais</Text>
        <Text className={`text-lg font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.absencePercentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingOverlay message="Carregando alunos..." />;

  return (
    <View className="flex-1 bg-gray-50 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}
      <ScreenHeader 
        title={`Alunos - ${semesterId}`} 
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          label: 'Exportar',
          onPress: () => setExportModalVisible(true),
          variant: 'info'
        }}
      />

      {/* Search Bar */}
      <View className="bg-white rounded-lg p-3 mb-4 border border-gray-200 flex-row items-center">
        <Feather name="search" size={20} color="#94a3b8" />
        <TextInput
          className="flex-1 ml-2 text-gray-800 font-medium"
          placeholder="Buscar por RA ou Nome"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState message={searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhum aluno matriculado.'} />
        }
      />

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        title="Exportar Alunos"
      />
    </View>
  );
}
