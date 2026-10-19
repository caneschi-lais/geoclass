import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';
import { ExportService } from '../services/ExportService';
import { StudentRisk } from '../types';

export interface StudentData {
  id: string;
  name: string;
  ra: string;
  absencePercentage: number;
  attendancePercentage?: number;
  active?: boolean;
  courses?: string[];
  subjects?: string[];
  userCourses?: { course_name: string; semester?: string; is_completed?: boolean }[];
}

export function useStudentsList(semesterId: string) {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState<'students' | 'risk' | 'classes'>('students');
  const [classes, setClasses] = useState<any[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);
  const [riskStudents, setRiskStudents] = useState<StudentRisk[]>([]);
  const [filteredRiskStudents, setFilteredRiskStudents] = useState<StudentRisk[]>([]);

  useEffect(() => {
    loadStudents();
    loadClasses();
    loadRiskStudents();
  }, [semesterId]);

  const loadStudents = async () => {
    try {
      const response = await api.get(`/coordenador/semestre/${semesterId}/alunos`);
      const normalized: StudentData[] = (response.data || []).map((s: any) => ({
        ...s,
        userCourses: (s.userCourses && s.userCourses.length > 0)
          ? s.userCourses.map((uc: any) => ({
              id: uc.id,
              user_id: uc.user_id,
              course_id: uc.course_id,
              course_name: uc.course_name || uc.course?.name || uc.name || 'Curso',
              semester: uc.semester || uc.student_term || null,
              is_completed: Boolean(uc.is_completed)
            }))
          : (s.courses || []).map((cName: string) => ({
              course_name: cName,
              semester: null,
              is_completed: false
            }))
      }));
      setStudents(normalized);
      setFilteredStudents(normalized);
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

  const loadRiskStudents = async () => {
    try {
      const response = await api.get('/coordenador/alunos-em-risco');
      setRiskStudents(response.data);
      setFilteredRiskStudents(response.data);
    } catch (error) {
      console.log('Error loading risk students', error);
    }
  };

  const toggleUserStatus = async (studentId: string, currentActive: boolean) => {
    try {
      const newStatus = !currentActive;
      await api.put('/coordenador/aluno/status', {
        userId: studentId,
        studentId,
        active: newStatus
      });
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, active: newStatus } : s))
      );
      setFilteredStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, active: newStatus } : s))
      );
    } catch (error: any) {
      console.log('Error toggling user status', error);
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível alterar o status do aluno.');
    }
  };

  const toggleCourseCompletion = async (studentId: string, courseName: string, currentIsCompleted: boolean) => {
    try {
      const newCompleted = !currentIsCompleted;
      await api.put('/coordenador/aluno/curso-status', {
        userId: studentId,
        studentId,
        course_name: courseName,
        courseName,
        is_completed: newCompleted,
        isCompleted: newCompleted
      });

      const updateCourses = (sList: StudentData[]) =>
        sList.map(s => {
          if (s.id === studentId && s.userCourses) {
            const updatedUserCourses = s.userCourses.map(uc =>
              uc.course_name === courseName ? { ...uc, is_completed: newCompleted } : uc
            );
            return { ...s, userCourses: updatedUserCourses };
          }
          return s;
        });

      setStudents(prev => updateCourses(prev));
      setFilteredStudents(prev => updateCourses(prev));
    } catch (error: any) {
      console.log('Error toggling course completion', error);
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível alterar a conclusão do curso.');
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const query = text.toLowerCase().trim();

    if (activeTab === 'students') {
      if (query === '') {
        setFilteredStudents(students);
      } else {
        const filtered = students.filter(s => {
          const matchName = s.name.toLowerCase().includes(query);
          const matchRa = s.ra.toLowerCase().includes(query);
          const matchCourses = s.courses?.some(c => c.toLowerCase().includes(query)) ||
            s.userCourses?.some(uc => uc.course_name.toLowerCase().includes(query));
          const matchSubjects = s.subjects?.some(sub => sub.toLowerCase().includes(query));

          return matchName || matchRa || matchCourses || matchSubjects;
        });
        setFilteredStudents(filtered);
      }
    } else if (activeTab === 'risk') {
      if (query === '') {
        setFilteredRiskStudents(riskStudents);
      } else {
        const filtered = riskStudents.filter(
          s => (s.ra && s.ra.toLowerCase().includes(query)) ||
            (s.studentName && s.studentName.toLowerCase().includes(query)) ||
            (s.name && s.name.toLowerCase().includes(query)) ||
            (s.subject && s.subject.toLowerCase().includes(query)) ||
            (s.course_name && s.course_name.toLowerCase().includes(query))
        );
        setFilteredRiskStudents(filtered);
      }
    } else {
      if (query === '') {
        setFilteredClasses(classes);
      } else {
        const filtered = classes.filter(
          c => c.subject.toLowerCase().includes(query) ||
            (c.course_name && c.course_name.toLowerCase().includes(query)) ||
            c.professor.name.toLowerCase().includes(query) ||
            (c.room_name && c.room_name.toLowerCase().includes(query))
        );
        setFilteredClasses(filtered);
      }
    }
  };

  const handleTabSwitch = (tab: 'students' | 'risk' | 'classes') => {
    setActiveTab(tab);
    setSearchQuery('');
    setFilteredStudents(students);
    setFilteredRiskStudents(riskStudents);
    setFilteredClasses(classes);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportModalVisible(false);
    setExporting(true);
    try {
      const response = await api.get(`/coordenador/relatorio?level=students&semesterId=${semesterId}&includeDetails=true`);
      const data = response.data;

      const sortedData = [...data].sort((a: any, b: any) => (a.attendancePercentage ?? Math.max(0, 100 - a.absencePercentage)) - (b.attendancePercentage ?? Math.max(0, 100 - b.absencePercentage))).slice(0, 5);
      const chartData: { label: string, value: number }[] = sortedData.map((s: any) => ({
        label: s.name,
        value: s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage)
      }));

      if (format === 'excel') {
        let excelData: any[] = [];
        data.forEach((s: any) => {
          const presence = s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage);
          excelData.push({ 'RA': s.ra, 'Nome': s.name, 'Presença (%)': presence, 'Matéria': '', 'Sala': '' });
          if (s.details) {
            s.details.forEach((d: any) => {
              const dPresence = d.attendancePercentage ?? Math.max(0, 100 - d.absencePercentage);
              excelData.push({ 'RA': '', 'Nome': '', 'Presença (%)': dPresence, 'Matéria': d.subject, 'Sala': d.room_name });
            });
          }
        });
        await ExportService.exportToExcel(excelData, `Relatorio_Alunos_${semesterId}`, {
          title: `Relatório de Alunos - ${semesterId}`,
          chartData
        });
      } else {
        const headers = ['Aluno', 'RA', 'Presença (%)', 'Matérias'];
        let rows: any[] = [];
        data.forEach((s: any) => {
          const presence = s.attendancePercentage ?? Math.max(0, 100 - s.absencePercentage);
          const sPercHtml = presence < 75 ? `<span class="high-absence">${presence}%</span>` : `${presence}%`;
          rows.push([`<strong style="color:#0ea5e9">${s.name}</strong>`, s.ra, `<strong>${sPercHtml}</strong>`, '']);
          if (s.details) {
            s.details.forEach((d: any) => {
              const dPresence = d.attendancePercentage ?? Math.max(0, 100 - d.absencePercentage);
              const dPercHtml = dPresence < 75 ? `<span class="high-absence">${dPresence}%</span>` : `${dPresence}%`;
              rows.push(['', '', dPercHtml, `${d.subject} (${d.room_name})`]);
            });
          }
        });

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
    riskStudents: filteredRiskStudents,
    searchQuery,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    activeTab,
    classes: filteredClasses,
    allClasses: classes,
    handleSearch,
    handleTabSwitch,
    handleExport,
    loadStudents,
    loadClasses,
    loadRiskStudents,
    toggleUserStatus,
    toggleCourseCompletion
  };
}
