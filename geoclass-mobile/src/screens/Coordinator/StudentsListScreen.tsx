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

  // Estados para Matérias & Professores
  const [activeTab, setActiveTab] = useState<'students' | 'classes'>('students');
  const [classes, setClasses] = useState<any[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);

  useEffect(() => {
    loadStudents();
    loadClasses();
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

  const loadClasses = async () => {
    try {
      const response = await api.get(`/coordenador/semestre/${semesterId}/turmas`);
      setClasses(response.data);
      setFilteredClasses(response.data);
    } catch (error) {
      console.log('Error loading classes', error);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (activeTab === 'students') {
      if (text.trim() === '') {
        setFilteredStudents(students);
      } else {
        const filtered = students.filter(
          s => s.ra.toLowerCase().includes(text.toLowerCase()) ||
            s.name.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredStudents(filtered);
      }
    } else {
      if (text.trim() === '') {
        setFilteredClasses(classes);
      } else {
        const filtered = classes.filter(
          c => c.subject.toLowerCase().includes(text.toLowerCase()) ||
            c.professor.name.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredClasses(filtered);
      }
    }
  };

  const handleTabSwitch = (tab: 'students' | 'classes') => {
    setActiveTab(tab);
    setSearchQuery('');
    setFilteredStudents(students);
    setFilteredClasses(classes);
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
        let chartData: { label: string, value: number }[] = sortedData.map((s: any) => ({
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
      className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border border-gray-100 dark:border-slate-700"
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
          <Text className="text-md font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>{item.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400 mt-1">RA: {item.ra}</Text>
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

  const renderClassItem = ({ item }: { item: any }) => (
    <View className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-slate-700 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="p-3 rounded-full mr-4 bg-sky-100 dark:bg-sky-900/30">
          <Feather name="book-open" size={24} color="#0284c7" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-md font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>
            {item.subject}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Prof. {item.professor.name}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.room_name} • Horário: {item.schedule_time}
          </Text>
        </View>
      </View>
      <View className="bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700/50">
        <Text className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase">
          {item.total_classes} Aulas
        </Text>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay message="Carregando dados..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}
      <ScreenHeader
        title={`${semesterId}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          label: 'Exportar',
          onPress: () => setExportModalVisible(true),
          variant: 'info'
        }}
      />

      {/* Tabs */}
      <View className="flex-row bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4 border border-gray-200 dark:border-gray-200/20 ">
        <TouchableOpacity
          className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('students')}
        >
          <Text className={`font-bold text-xs ${activeTab === 'students' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Alunos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'classes' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('classes')}
        >
          <Text className={`font-bold text-xs ${activeTab === 'classes' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Matérias & Professores
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-slate-700 flex-row items-center">
        <Feather name="search" size={20} color="#94a3b8" />
        <TextInput
          className="flex-1 ml-2 text-gray-800 dark:text-slate-100 font-medium"
          placeholder={activeTab === 'students' ? "Buscar por RA ou Nome" : "Buscar por Matéria ou Professor"}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={activeTab === 'students' ? filteredStudents : filteredClasses}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'students' ? renderItem : renderClassItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              activeTab === 'students'
                ? (searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhum aluno matriculado.')
                : (searchQuery ? 'Nenhuma matéria encontrada.' : 'Nenhuma matéria cadastrada.')
            }
          />
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
