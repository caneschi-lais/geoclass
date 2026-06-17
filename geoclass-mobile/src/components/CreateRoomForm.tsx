import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

interface Professor {
  id: string;
  name: string;
  email: string;
}

interface CreateRoomFormProps {
  isOpen: boolean;
  onToggle: () => void;
  professors: Professor[];
  onSuccess: () => void;
}

export default function CreateRoomForm({ isOpen, onToggle, professors, onSuccess }: CreateRoomFormProps) {
  const [roomName, setRoomName] = useState('');
  const [roomLat, setRoomLat] = useState('');
  const [roomLon, setRoomLon] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Estados opcionais de Atribuição de Classe
  const [assignClass, setAssignClass] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedProf, setSelectedProf] = useState<Professor | null>(null);
  const [profModalVisible, setProfModalVisible] = useState(false);

  const handleCreateRoom = async () => {
    if (!roomName || !roomLat || !roomLon) {
      Alert.alert('Aviso', 'Preencha todos os campos da sala.');
      return;
    }
    if (assignClass) {
      if (!subjectName || !scheduleTime || !selectedProf) {
        Alert.alert('Aviso', 'Preencha todos os campos para atribuir a turma.');
        return;
      }
    }
    setCreatingRoom(true);
    try {
      await api.post('/coordenador/sala', {
        name: roomName,
        latitude: parseFloat(roomLat),
        longitude: parseFloat(roomLon),
        assignClass,
        subject: subjectName,
        schedule_time: scheduleTime,
        professor_id: selectedProf?.id
      });
      Alert.alert('Sucesso', 'Sala cadastrada ' + (assignClass ? 'e vinculada à turma ' : '') + 'com sucesso!');
      setRoomName('');
      setRoomLat('');
      setRoomLon('');
      setSubjectName('');
      setScheduleTime('');
      setSelectedProf(null);
      setAssignClass(false);
      onToggle();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao cadastrar sala.');
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <View className="mb-4">
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-row justify-between items-center"
        onPress={onToggle}
      >
        <View className="flex-row items-center">
          <Feather name="plus-circle" size={20} color="#0ea5e9" />
          <Text className="text-gray-800 dark:text-slate-100 font-bold ml-2">Cadastrar Nova Sala</Text>
        </View>
        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#94a3b8" />
      </TouchableOpacity>

      {isOpen && (
        <View className="bg-white dark:bg-slate-800 p-4 mt-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700">
          <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nome da Sala</Text>
          <TextInput
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-3 text-gray-800 dark:text-slate-100"
            placeholder="Ex: Lab de Informática 1"
            value={roomName}
            onChangeText={setRoomName}
          />

          <View className="flex-row justify-between mb-3">
            <View className="flex-1 mr-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Latitude</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: -23.5505"
                keyboardType="numeric"
                value={roomLat}
                onChangeText={setRoomLat}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Longitude</Text>
              <TextInput
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: -46.6333"
                keyboardType="numeric"
                value={roomLon}
                onChangeText={setRoomLon}
              />
            </View>
          </View>

          <TouchableOpacity
            className="flex-row items-center mb-3 bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-200/50 dark:border-slate-700/50"
            onPress={() => setAssignClass(!assignClass)}
          >
            <View className={`w-5 h-5 rounded border items-center justify-center mr-3 ${assignClass ? 'bg-sky-500 border-sky-500' : 'border-gray-400'}`}>
              {assignClass && <Feather name="check" size={14} color="#fff" />}
            </View>
            <Text className="text-gray-700 dark:text-slate-200 font-bold text-xs">Atribuir a sala a uma nova matéria/turma</Text>
          </TouchableOpacity>

          {assignClass && (
            <View className="bg-gray-50 dark:bg-slate-900/40 p-3 rounded-lg border border-gray-150 dark:border-slate-800 mb-4">
              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Nome da Matéria</Text>
              <TextInput
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: Engenharia de Software II"
                value={subjectName}
                onChangeText={setSubjectName}
              />

              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Horário (Ex: 08:00)</Text>
              <TextInput
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 mb-3 text-gray-800 dark:text-slate-100"
                placeholder="Ex: 08:00"
                value={scheduleTime}
                onChangeText={setScheduleTime}
              />

              <Text className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Professor Responsável</Text>
              <TouchableOpacity
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 flex-row justify-between items-center"
                onPress={() => setProfModalVisible(true)}
              >
                <Text className={selectedProf ? "text-gray-800 dark:text-slate-100 font-medium" : "text-gray-400"}>
                  {selectedProf ? selectedProf.name : "Selecione o professor"}
                </Text>
                <Feather name="chevron-down" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            className={`py-3 rounded-lg items-center ${creatingRoom ? 'bg-sky-400' : 'bg-sky-500'}`}
            onPress={handleCreateRoom}
            disabled={creatingRoom}
          >
            <Text className="text-white font-bold">{creatingRoom ? 'Salvando...' : 'Salvar Sala'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Seleção de Professor */}
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
    </View>
  );
}
