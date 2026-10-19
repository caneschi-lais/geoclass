import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import api from '../services/api';
import { ExportService } from '../services/ExportService';

interface SemesterData {
  id: string;
  name: string;
  absencePercentage: number;
  attendancePercentage?: number;
}

interface Professor {
  id: string;
  name: string;
  email: string;
}

export function useSemesters() {
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [currentSemester, setCurrentSemester] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [executingVirada, setExecutingVirada] = useState(false);

  useEffect(() => {
    loadSemesters();
    loadProfessors();
    loadCurrentSemester();
  }, []);

  const loadCurrentSemester = async () => {
    try {
      const response = await api.get('/coordenador/semestre-atual');
      if (response.data?.currentSemester) {
        setCurrentSemester(response.data.currentSemester);
      }
    } catch (error) {
      console.log('Error loading current semester info', error);
    }
  };

  const loadSemesters = async () => {
    try {
      const response = await api.get('/coordenador/semestres');
      setSemesters(response.data);
    } catch (error) {
      console.log('Error loading semesters', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfessors = async () => {
    try {
      const response = await api.get('/coordenador/professores');
      setProfessors(response.data);
    } catch (error) {
      console.log('Error loading professors', error);
    }
  };

  const executeViradaSemestreApi = async () => {
    setExecutingVirada(true);
    try {
      const res = await api.post('/coordenador/virada-semestre');
      const msg = `${res.data.message}\n\nAlunos atualizados: ${res.data.updatedStudentsCount}\nNovos concluintes: ${res.data.completedStudentsCount}`;
      if (Platform.OS === 'web') {
        window.alert(`Sucesso!\n\n${msg}`);
      } else {
        Alert.alert('Sucesso!', msg);
      }
      loadSemesters();
      loadCurrentSemester();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erro ao realizar virada de semestre.';
      if (Platform.OS === 'web') {
        window.alert(`Erro: ${errorMsg}`);
      } else {
        Alert.alert('Erro', errorMsg);
      }
    } finally {
      setExecutingVirada(false);
    }
  };

  const handleViradaSemestre = () => {
    executeViradaSemestreApi();
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const response = await api.get(`/coordenador/relatorio?level=semesters&includeDetails=true`);
      const data = response.data;

      const chartData: { label: string, value: number }[] = data.map((s: any) => ({
        label: `Semestre ${s.semester}`,
        value: s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage)
      }));

      if (format === 'excel') {
        let excelData: any[] = [];
        data.forEach((s: any) => {
          const presence = s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage);
          excelData.push({ 'Semestre': s.semester, 'Presença (%)': presence, 'Detalhes': '' });
          if (s.details) {
            s.details.forEach((d: any) => {
              const dPresence = d.attendancePercentage ?? Math.max(0, 100 - d.absencePercentage);
              excelData.push({ 'Semestre': '', 'Presença (%)': dPresence, 'Detalhes': `Aluno: ${d.name} (RA: ${d.ra})` });
            });
          }
        });
        await ExportService.exportToExcel(excelData, 'Relatorio_Semestres', {
          title: 'Relatório de Semestres',
          chartData
        });
      } else {
        const headers = ['Semestre', 'Aluno', 'RA', 'Presença (%)'];
        let rows: any[] = [];
        data.forEach((s: any) => {
          const presence = s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage);
          rows.push([`<strong style="color:#0ea5e9">${s.semester}</strong>`, '', '', `<strong style="color:#0ea5e9">${presence}%</strong>`]);
          if (s.details) {
            s.details.forEach((d: any) => {
              const dPresence = d.attendancePercentage ?? Math.max(0, 100 - d.absencePercentage);
              const percHtml = dPresence < 75 ? `<span class="high-absence">${dPresence}%</span>` : `${dPresence}%`;
              rows.push(['', d.name, d.ra, percHtml]);
            });
          }
        });

        const html = ExportService.generateHTMLTable('Relatório de Semestres', headers, rows, chartData);
        await ExportService.exportToPDF(html, 'Relatorio_Semestres');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao exportar relatório.');
    } finally {
      setExporting(false);
    }
  };

  return {
    semesters,
    currentSemester,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    executingVirada,
    isAccordionOpen,
    setIsAccordionOpen,
    professors,
    loadSemesters,
    handleViradaSemestre,
    handleExport
  };
}
