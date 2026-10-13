import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, FlatList, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface Student {
  id: string;
  name: string;
  email: string;
  ra: string;
  enrollments?: { class_id: string }[];
}

interface ClassItem {
  id: string;
  subject: string;
  room_name: string;
  schedule_time: string;
  professor: {
    name: string;
  };
  enrollments?: { student_id: string }[];
}

interface EnrollStudentFormProps {
  isOpen: boolean;
  onToggle: () => void;
  classes: ClassItem[];
  onSuccess: () => void;
  semesterId?: string;
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function EnrollStudentForm({ isOpen, onToggle, classes, onSuccess, semesterId }: EnrollStudentFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [internalClasses, setInternalClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAllStudents();
      loadClassesFallback();
    }
  }, [isOpen, semesterId]);

  const loadAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/coordenador/alunos');
      setStudents(response.data);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      showAlert('Erro', 'Não foi possível carregar a lista de alunos.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadClassesFallback = async () => {
    if (classes && classes.length > 0) {
      setInternalClasses(classes);
      return;
    }
    setLoadingClasses(true);
    try {
      const sem = semesterId || '2026.2';
      const response = await api.get(`/coordenador/semestre/${sem}/turmas`);
      setInternalClasses(response.data);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClass) {
      showAlert('Aviso', 'Selecione um aluno e uma matéria.');
      return;
    }

    setEnrolling(true);
    try {
      await api.post('/coordenador/matricular', {
        student_id: selectedStudent.id,
        class_id: selectedClass.id
      });
      showAlert('Sucesso', `Aluno ${selectedStudent.name} matriculado em ${selectedClass.subject} com sucesso!`);

      const enrolledStudentId = selectedStudent.id;
      const enrolledClassId = selectedClass.id;

      // Atualiza o estado local para que ambos reflitam a nova matrícula imediatamente
      setStudents(prev => prev.map(s => {
        if (s.id === enrolledStudentId) {
          const currentEnrs = s.enrollments || [];
          return { ...s, enrollments: [...currentEnrs, { class_id: enrolledClassId }] };
        }
        return s;
      }));

      setInternalClasses(prev => prev.map(c => {
        if (c.id === enrolledClassId) {
          const currentEnrs = c.enrollments || [];
          return { ...c, enrollments: [...currentEnrs, { student_id: enrolledStudentId }] };
        }
        return c;
      }));

      setSelectedStudent(null);
      setSelectedClass(null);
      onToggle();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao matricular aluno:', error);
      showAlert('Erro', error.response?.data?.error || 'Erro ao matricular aluno no banco de dados.');
    } finally {
      setEnrolling(false);
    }
  };

  // 1. Filtragem recíproca de Alunos:
  // Se uma matéria já foi selecionada, exibe SOMENTE alunos NÃO matriculados nela
  const availableStudents = students.filter(student => {
    if (!selectedClass) return true;
    const isEnrolled = 
      selectedClass.enrollments?.some(e => e.student_id === student.id) ||
      student.enrollments?.some(e => e.class_id === selectedClass.id);
    return !isEnrolled;
  });

  const filteredStudents = availableStudents.filter(student => 
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.ra.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // 2. Filtragem recíproca de Matérias:
  // Se um aluno já foi selecionado, exibe SOMENTE matérias em que o aluno NÃO está matriculado
  const activeClassesList = (classes && classes.length > 0) ? classes : internalClasses;

  const availableClasses = activeClassesList.filter(cls => {
    if (!selectedStudent) return true;
    const isEnrolled = 
      selectedStudent.enrollments?.some(e => e.class_id === cls.id) ||
      cls.enrollments?.some(e => e.student_id === selectedStudent.id);
    return !isEnrolled;
  });

  const filteredClasses = availableClasses.filter(item => {
    const q = classSearch.toLowerCase().trim();
    if (!q) return true;
    const matchSubject = item.subject?.toLowerCase().includes(q);
    const matchProf = item.professor?.name?.toLowerCase().includes(q);
    const matchRoom = item.room_name?.toLowerCase().includes(q);
    const matchTime = item.schedule_time?.toLowerCase().includes(q);
    return matchSubject || matchProf || matchRoom || matchTime;
  });

  return (
    <View className="mb-4">
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
        onPress={onToggle}
      >
        <View className="flex-row items-center">
          <Feather name="user-plus" size={20} color="#10b981" />
          <Text className="text-gray-800 dark:text-slate-100 font-bold ml-2">Matricular Aluno em Matéria</Text>
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
      </TouchableOpacity>

      {isOpen && (
        <View className="bg-white dark:bg-slate-800 p-4 mt-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          
          {/* Selecionar Aluno */}
          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Selecionar Aluno</Text>
          <TouchableOpacity
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center mb-4"
            onPress={() => setStudentModalVisible(true)}
            disabled={loadingStudents}
          >
            {loadingStudents ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : selectedStudent ? (
              <View className="flex-row items-center flex-1 justify-between pr-2">
                <Text className="text-gray-800 dark:text-slate-100 font-medium flex-1 mr-2" numberOfLines={1}>
                  {selectedStudent.name} (RA: {selectedStudent.ra})
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedStudent(null);
                  }}
                  className="p-1 rounded-full bg-gray-200 dark:bg-slate-700"
                >
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-gray-400">
                {selectedClass ? 'Selecione um aluno não matriculado' : 'Selecione o aluno'}
              </Text>
            )}
            <Feather name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Selecionar Matéria */}
          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Selecionar Matéria</Text>
          <TouchableOpacity
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center mb-4"
            onPress={() => setClassModalVisible(true)}
            disabled={loadingClasses}
          >
            {loadingClasses ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : selectedClass ? (
              <View className="flex-row items-center flex-1 justify-between pr-2">
                <Text className="text-gray-800 dark:text-slate-100 font-medium flex-1 mr-2" numberOfLines={1}>
                  {selectedClass.subject} ({selectedClass.room_name})
                </Text>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedClass(null);
                  }}
                  className="p-1 rounded-full bg-gray-200 dark:bg-slate-700"
                >
                  <Feather name="x" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="text-gray-400">
                {selectedStudent ? 'Selecione uma matéria disponível para o aluno' : 'Selecione a matéria'}
              </Text>
            )}
            <Feather name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Botão de Enviar */}
          <TouchableOpacity
            className={`py-3 rounded-lg items-center ${enrolling ? 'bg-emerald-400' : 'bg-emerald-500'}`}
            onPress={handleEnroll}
            disabled={enrolling}
          >
            <Text className="text-white font-bold">{enrolling ? 'Matriculando...' : 'Confirmar Matrícula'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Seleção de Aluno */}
      <Modal
        visible={studentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStudentModalVisible(false)}
      >
        <View 
          className="flex-1 justify-end bg-black/50"
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
            ...(Platform.OS === 'web' ? { height: '100vh', width: '100vw', position: 'fixed', inset: 0, zIndex: 9999 } : {})
          }}
        >
          <View 
            className="bg-white dark:bg-slate-800 rounded-t-3xl p-6"
            style={{ 
              height: Platform.OS === 'web' ? '75vh' : '75%', 
              maxHeight: Platform.OS === 'web' ? '75vh' : '85%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Aluno</Text>
                {selectedClass && (
                  <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                    Apenas alunos não matriculados em "{selectedClass.subject}"
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Campo de Busca no Modal */}
            <View className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 mb-3 flex-row items-center">
              <Feather name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 text-gray-800 dark:text-slate-100"
                placeholder="Buscar por RA ou Nome"
                placeholderTextColor="#94a3b8"
                value={studentSearch}
                onChangeText={setStudentSearch}
                autoCapitalize="none"
              />
              {studentSearch.length > 0 && (
                <TouchableOpacity onPress={() => setStudentSearch('')}>
                  <Feather name="x-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              style={{ 
                flex: 1,
                ...(Platform.OS === 'web' ? { overflowY: 'auto' as any, maxHeight: 'calc(75vh - 130px)' as any } : {})
              }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-3.5 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedStudent(item);
                    setStudentModalVisible(false);
                    setStudentSearch('');
                  }}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">RA: {item.ra} • {item.email}</Text>
                  </View>
                  {selectedStudent?.id === item.id && (
                    <Feather name="check" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-8 items-center">
                  <Text className="text-center text-gray-500 dark:text-slate-400">
                    {studentSearch 
                      ? 'Nenhum aluno encontrado para a busca.' 
                      : selectedClass 
                        ? 'Todos os alunos cadastrados já estão vinculados a esta matéria!' 
                        : 'Nenhum aluno encontrado.'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Matéria */}
      <Modal
        visible={classModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setClassModalVisible(false)}
      >
        <View 
          className="flex-1 justify-end bg-black/50"
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.5)',
            ...(Platform.OS === 'web' ? { height: '100vh', width: '100vw', position: 'fixed', inset: 0, zIndex: 9999 } : {})
          }}
        >
          <View 
            className="bg-white dark:bg-slate-800 rounded-t-3xl p-6"
            style={{ 
              height: Platform.OS === 'web' ? '75vh' : '75%', 
              maxHeight: Platform.OS === 'web' ? '75vh' : '85%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Matéria</Text>
                {selectedStudent && (
                  <Text className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                    Apenas matérias em que {selectedStudent.name} não está matriculado
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setClassModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Campo de Busca no Modal de Matéria */}
            <View className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 mb-3 flex-row items-center">
              <Feather name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 text-gray-800 dark:text-slate-100"
                placeholder="Buscar por matéria, sala ou professor"
                placeholderTextColor="#94a3b8"
                value={classSearch}
                onChangeText={setClassSearch}
                autoCapitalize="none"
              />
              {classSearch.length > 0 && (
                <TouchableOpacity onPress={() => setClassSearch('')}>
                  <Feather name="x-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredClasses}
              keyExtractor={(item) => item.id}
              style={{ 
                flex: 1,
                ...(Platform.OS === 'web' ? { overflowY: 'auto' as any, maxHeight: 'calc(75vh - 130px)' as any } : {})
              }}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-3.5 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedClass(item);
                    setClassModalVisible(false);
                    setClassSearch('');
                  }}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.subject}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Prof. {item.professor?.name || 'A definir'} • Sala: {item.room_name} • Horário: {item.schedule_time}
                    </Text>
                  </View>
                  {selectedClass?.id === item.id && (
                    <Feather name="check" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-8 items-center">
                  <Text className="text-center text-gray-500 dark:text-slate-400">
                    {classSearch 
                      ? 'Nenhuma matéria encontrada para a busca.' 
                      : selectedStudent 
                        ? 'Este aluno já está matriculado em todas as matérias disponíveis neste semestre!' 
                        : 'Nenhuma matéria disponível neste semestre.'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
