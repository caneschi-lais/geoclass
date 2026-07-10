import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Modal, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface Student {
  id: string;
  name: string;
  email: string;
  ra: string;
}

interface ClassItem {
  id: string;
  subject: string;
  room_name: string;
  schedule_time: string;
  professor: {
    name: string;
  };
}

interface EnrollStudentFormProps {
  isOpen: boolean;
  onToggle: () => void;
  classes: ClassItem[];
  onSuccess: () => void;
}

export default function EnrollStudentForm({ isOpen, onToggle, classes, onSuccess }: EnrollStudentFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [classModalVisible, setClassModalVisible] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAllStudents();
    }
  }, [isOpen]);

  const loadAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/coordenador/alunos');
      setStudents(response.data);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de alunos.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClass) {
      Alert.alert('Aviso', 'Selecione um aluno e uma matéria.');
      return;
    }

    setEnrolling(true);
    try {
      await api.post('/coordenador/matricular', {
        student_id: selectedStudent.id,
        class_id: selectedClass.id
      });
      Alert.alert('Sucesso', `Aluno ${selectedStudent.name} matriculado em ${selectedClass.subject} com sucesso!`);
      setSelectedStudent(null);
      setSelectedClass(null);
      onToggle();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao matricular aluno.');
    } finally {
      setEnrolling(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.ra.toLowerCase().includes(studentSearch.toLowerCase())
  );

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
            ) : (
              <Text className={selectedStudent ? "text-gray-800 dark:text-slate-100 font-medium" : "text-gray-400"}>
                {selectedStudent ? `${selectedStudent.name} (RA: ${selectedStudent.ra})` : "Selecione o aluno"}
              </Text>
            )}
            <Feather name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Selecionar Matéria */}
          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Selecionar Matéria</Text>
          <TouchableOpacity
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center mb-4"
            onPress={() => setClassModalVisible(true)}
          >
            <Text className={selectedClass ? "text-gray-800 dark:text-slate-100 font-medium" : "text-gray-400"}>
              {selectedClass ? `${selectedClass.subject} (${selectedClass.room_name})` : "Selecione a matéria"}
            </Text>
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
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Aluno</Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Campo de Busca no Modal */}
            <View className="bg-gray-50 dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg p-2 mb-4 flex-row items-center">
              <Feather name="search" size={18} color="#94a3b8" className="mr-2" />
              <TextInput
                className="flex-1 text-gray-800 dark:text-slate-100"
                placeholder="Buscar por RA ou Nome"
                placeholderTextColor="#94a3b8"
                value={studentSearch}
                onChangeText={setStudentSearch}
              />
            </View>

            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedStudent(item);
                    setStudentModalVisible(false);
                    setStudentSearch('');
                  }}
                >
                  <View>
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">RA: {item.ra} • {item.email}</Text>
                  </View>
                  {selectedStudent?.id === item.id && (
                    <Feather name="check" size={18} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 dark:text-slate-400 my-8">
                  Nenhum aluno encontrado.
                </Text>
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
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[60%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Matéria</Text>
              <TouchableOpacity onPress={() => setClassModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={classes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedClass(item);
                    setClassModalVisible(false);
                  }}
                >
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.subject}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Prof. {item.professor.name} • {item.room_name} • {item.schedule_time}
                    </Text>
                  </View>
                  {selectedClass?.id === item.id && (
                    <Feather name="check" size={18} color="#10b981" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 dark:text-slate-400 my-8">
                  Nenhuma matéria disponível.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
