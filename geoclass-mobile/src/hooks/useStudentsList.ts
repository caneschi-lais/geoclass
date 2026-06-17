import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { ExportService } from '../services/ExportService';

interface StudentData {
  id: string;
  name: string;
  ra: string;
  absencePercentage: number;
}

export function useStudentsList(semesterId: string) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  return {
    students: filteredStudents,
    searchQuery,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    activeTab,
    classes: filteredClasses,
    handleSearch,
    handleTabSwitch,
    handleExport,
    loadStudents,
    loadClasses
  };
}
