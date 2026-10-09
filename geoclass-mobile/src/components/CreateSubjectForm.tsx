import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, FlatList, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface Professor {
  id: string;
  name: string;
  email: string;
}

interface Room {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface CreateSubjectFormProps {
  isOpen: boolean;
  onToggle: () => void;
  professors: Professor[];
  onSuccess: () => void;
  currentSemester?: string;
}

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function CreateSubjectForm({
  isOpen,
  onToggle,
  professors,
  onSuccess,
  currentSemester = '2026.1'
}: CreateSubjectFormProps) {
  const [subjectName, setSubjectName] = useState('');
  const [courseName, setCourseName] = useState('Análise e Desenvolvimento de Sistemas');
  const [scheduleTime, setScheduleTime] = useState('');
  const [weekDays, setWeekDays] = useState('segunda');
  const [totalClasses, setTotalClasses] = useState('40');
  const [semesterStr, setSemesterStr] = useState(currentSemester);

  const [selectedProf, setSelectedProf] = useState<Professor | null>(null);
  const [profModalVisible, setProfModalVisible] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [customRoomName, setCustomRoomName] = useState('');
  const [roomModalVisible, setRoomModalVisible] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRooms();
    }
  }, [isOpen]);

  const loadRooms = async () => {
    try {
      const response = await api.get('/coordenador/salas');
      setRooms(response.data);
    } catch (error) {
      console.log('Error loading rooms for subject creation', error);
    }
  };

  const handleCreateSubject = async () => {
    if (!subjectName.trim()) {
      showAlert('Aviso', 'Preencha o nome da matéria.');
      return;
    }
    if (!scheduleTime.trim()) {
      showAlert('Aviso', 'Preencha o horário da aula (Ex: 08:00).');
      return;
    }
    if (!selectedProf) {
      showAlert('Aviso', 'Selecione o professor responsável.');
      return;
    }

    const roomNameFinal = selectedRoom ? selectedRoom.name : (customRoomName.trim() || 'Sala Padrão');

    setSubmitting(true);
    try {
      await api.post('/coordenador/materia', {
        subject: subjectName.trim(),
        course_name: courseName.trim(),
        schedule_time: scheduleTime.trim(),
        week_days: weekDays.trim(),
        semester: semesterStr.trim() || currentSemester,
        room_name: roomNameFinal,
        total_classes: parseInt(totalClasses, 10) || 40,
        professor_id: selectedProf.id
      });

      showAlert('Sucesso', `Matéria "${subjectName.trim()}" cadastrada com sucesso!`);
      setSubjectName('');
      setScheduleTime('');
      setSelectedProf(null);
      setSelectedRoom(null);
      setCustomRoomName('');
      onToggle();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao cadastrar matéria:', error);
      showAlert('Erro', error.response?.data?.error || 'Erro ao cadastrar a matéria no banco de dados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="mb-4">
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
        onPress={onToggle}
      >
        <View className="flex-row items-center">
          <View className="bg-sky-100 dark:bg-sky-950/40 p-2 rounded-lg mr-2.5">
            <Feather name="book-open" size={18} color="#0ea5e9" />
          </View>
          <Text className="text-gray-800 dark:text-slate-100 font-bold">Cadastrar Nova Matéria</Text>
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
      </TouchableOpacity>

      {isOpen && (
        <View className="bg-white dark:bg-slate-800 p-4 mt-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nome da Matéria</Text>
          <TextInput
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-3 text-gray-800 dark:text-slate-100"
            placeholder="Ex: Estrutura de Dados"
            value={subjectName}
            onChangeText={setSubjectName}
          />

          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Curso</Text>
          <TextInput
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-3 text-gray-800 dark:text-slate-100"
            placeholder="Ex: Análise e Desenvolvimento de Sistemas"
            value={courseName}
            onChangeText={setCourseName}
          />

          <View className="flex-row justify-between mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Horário (Ex: 08:00)</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: 08:00"
                value={scheduleTime}
                onChangeText={setScheduleTime}
              />
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Semestre Letivo</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: 2026.1"
                value={semesterStr}
                onChangeText={setSemesterStr}
              />
            </View>
          </View>

          <View className="flex-row justify-between mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Dias da Semana</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: segunda,quarta"
                value={weekDays}
                onChangeText={setWeekDays}
              />
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Total de Aulas</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: 40"
                keyboardType="numeric"
                value={totalClasses}
                onChangeText={setTotalClasses}
              />
            </View>
          </View>

          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Professor Responsável</Text>
          <TouchableOpacity
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center mb-3"
            onPress={() => setProfModalVisible(true)}
          >
            <Text className={selectedProf ? "text-gray-800 dark:text-slate-100 font-medium" : "text-gray-400"}>
              {selectedProf ? selectedProf.name : "Selecione o professor"}
            </Text>
            <Feather name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Sala Padrão da Aula</Text>
          <TouchableOpacity
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center mb-4"
            onPress={() => setRoomModalVisible(true)}
          >
            <Text className={selectedRoom || customRoomName ? "text-gray-800 dark:text-slate-100 font-medium" : "text-gray-400"}>
              {selectedRoom ? selectedRoom.name : (customRoomName || "Selecione ou informe a sala")}
            </Text>
            <Feather name="chevron-down" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            className={`py-3 rounded-lg items-center ${submitting ? 'bg-sky-400' : 'bg-sky-500'}`}
            onPress={handleCreateSubject}
            disabled={submitting}
          >
            <Text className="text-white font-bold">{submitting ? 'Salvando...' : 'Salvar Matéria'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Selecionar Professor */}
      <Modal
        visible={profModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProfModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[60%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Professor</Text>
              <TouchableOpacity onPress={() => setProfModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={professors}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedProf(item);
                    setProfModalVisible(false);
                  }}
                >
                  <View>
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{item.email}</Text>
                  </View>
                  {selectedProf?.id === item.id && (
                    <Feather name="check" size={18} color="#0ea5e9" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-500 dark:text-slate-400 my-8">
                  Nenhum professor cadastrado.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Modal Selecionar Sala */}
      <Modal
        visible={roomModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRoomModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 max-h-[70%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Selecionar Sala</Text>
              <TouchableOpacity onPress={() => setRoomModalVisible(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className="py-4 border-b border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
                  onPress={() => {
                    setSelectedRoom(item);
                    setCustomRoomName('');
                    setRoomModalVisible(false);
                  }}
                >
                  <View>
                    <Text className="text-base font-bold text-gray-800 dark:text-slate-100">{item.name}</Text>
                    <Text className="text-xs text-gray-400 dark:text-slate-500">Lat: {item.latitude}, Lon: {item.longitude}</Text>
                  </View>
                  {selectedRoom?.id === item.id && (
                    <Feather name="check" size={18} color="#0ea5e9" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View className="py-4">
                  <Text className="text-center text-gray-500 dark:text-slate-400 mb-4">
                    Nenhuma sala previamente cadastrada.
                  </Text>
                </View>
              }
            />

            <View className="border-t border-gray-100 dark:border-slate-700 pt-4 mt-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-2">Ou digite o nome de outra sala:</Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                  placeholder="Ex: Lab 3"
                  value={customRoomName}
                  onChangeText={(t) => {
                    setCustomRoomName(t);
                    setSelectedRoom(null);
                  }}
                />
                <TouchableOpacity
                  className="bg-sky-500 px-4 rounded-lg items-center justify-center"
                  onPress={() => setRoomModalVisible(false)}
                >
                  <Text className="text-white font-bold text-xs">OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
