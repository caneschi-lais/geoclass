import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

type Room = {
  id: string;
  name: string;
};

type Props = {
  visible: boolean;
  classId: string;
  scheduleTime: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function ChangeRoomModal({ visible, classId, scheduleTime, onClose, onSuccess }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]); // Default: Hoje

  useEffect(() => {
    if (visible) {
      loadRooms();
    }
  }, [visible, selectedDate]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/professor/salas-disponiveis?date=${selectedDate}&schedule_time=${scheduleTime}`);
      setRooms(response.data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as salas.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (roomId: string | null) => {
    setSaving(true);
    try {
      await api.post(`/professor/turma/${classId}/trocar-sala`, {
        roomId,
        date: selectedDate
      });
      Alert.alert('Sucesso', roomId ? 'Sala alterada para esta aula!' : 'Sala padrão restaurada com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Ops', error.response?.data?.error || 'Erro ao alterar sala.');
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 min-h-[50%] max-h-[80%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Trocar Sala da Aula</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-gray-500 dark:text-slate-400 mb-4">
            A troca afetará o Geofencing apenas na data de hoje ({new Date(selectedDate).toLocaleDateString('pt-BR')}) para o horário das {scheduleTime}.
          </Text>

          {/* Botão de Restaurar Sala Original */}
          <TouchableOpacity 
            disabled={saving}
            onPress={() => handleConfirm(null)}
            className="bg-sky-50 py-3 rounded-xl mb-4 border border-sky-200 items-center flex-row justify-center"
          >
            <Feather name="refresh-ccw" size={16} color="#0369a1" />
            <Text className="text-sky-700 font-bold ml-2">Restaurar Sala Padrão</Text>
          </TouchableOpacity>

          <Text className="font-bold text-gray-700 mb-2 uppercase tracking-wider text-xs">Salas Disponíveis</Text>
          
          {loading ? (
            <View className="py-8 items-center">
              <Text className="text-gray-500 dark:text-slate-400">Buscando salas livres...</Text>
            </View>
          ) : rooms.length === 0 ? (
            <View className="py-8 items-center bg-gray-50 dark:bg-slate-900 rounded-xl">
              <Feather name="info" size={24} color="#94a3b8" />
              <Text className="text-gray-500 dark:text-slate-400 mt-2">Nenhuma sala livre para este horário.</Text>
            </View>
          ) : (
            <FlatList
              data={rooms}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  disabled={saving}
                  onPress={() => handleConfirm(item.id)}
                  className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl mb-2 flex-row items-center justify-between border border-gray-200 dark:border-slate-700"
                >
                  <View className="flex-row items-center">
                    <Feather name="map-pin" size={18} color="#0ea5e9" />
                    <Text className="text-gray-800 dark:text-slate-100 font-bold ml-3 text-base">{item.name}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
