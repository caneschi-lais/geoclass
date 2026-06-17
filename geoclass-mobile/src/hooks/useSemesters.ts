import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { ExportService } from '../services/ExportService';

interface SemesterData {
  id: string;
  name: string;
  absencePercentage: number;
}

interface Professor {
  id: string;
  name: string;
  email: string;
}

export function useSemesters() {
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [professors, setProfessors] = useState<Professor[]>([]);

  useEffect(() => {
    loadSemesters();
    loadProfessors();
  }, []);

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

  const handleExport = async (format: 'pdf' | 'excel', includeDetails: boolean) => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const response = await api.get(`/coordenador/relatorio?level=semesters&includeDetails=${includeDetails}`);
      const data = response.data;

      if (format === 'excel') {
        let excelData: any[] = [];
        data.forEach((s: any) => {
          excelData.push({ 'Semestre': s.semester, 'Faltas (%)': s.absencePercentage, 'Detalhes': '' });
          if (includeDetails && s.details) {
            s.details.forEach((d: any) => {
              excelData.push({ 'Semestre': '', 'Faltas (%)': d.absencePercentage, 'Detalhes': `Aluno: ${d.name} (RA: ${d.ra})` });
            });
          }
        });
        await ExportService.exportToExcel(excelData, 'Relatorio_Semestres');
      } else {
        const headers = includeDetails ? ['Semestre', 'Aluno', 'RA', 'Faltas (%)'] : ['Semestre', 'Faltas (%)'];
        let rows: any[] = [];
        data.forEach((s: any) => {
          if (!includeDetails) {
            rows.push([s.semester, `${s.absencePercentage}%`]);
          } else {
            rows.push([`<strong style="color:#0ea5e9">${s.semester}</strong>`, '', '', `<strong style="color:#0ea5e9">${s.absencePercentage}%</strong>`]);
            if (s.details) {
              s.details.forEach((d: any) => {
                const percHtml = d.absencePercentage >= 25 ? `<span class="high-absence">${d.absencePercentage}%</span>` : `${d.absencePercentage}%`;
                rows.push(['', d.name, d.ra, percHtml]);
              });
            }
          }
        });

        let chartData: { label: string, value: number }[] = data.map((s: any) => ({
          label: `Semestre ${s.semester}`,
          value: s.absencePercentage
        }));

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
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    isAccordionOpen,
    setIsAccordionOpen,
    professors,
    loadSemesters,
    handleExport
  };
}
