import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import api from '../../services/api';
import { ClassData } from '../../types';
import { deleteToken } from '../../services/authStorage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfessorStackParamList } from '../../navigation/ProfessorNavigator';
import { Feather } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ChangeRoomModal from '../../components/ChangeRoomModal';

type Props = {
  navigation: NativeStackNavigationProp<ProfessorStackParamList, 'Classes'>;
};

export default function ProfessorClassesScreen({ navigation }: Props) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await api.get('/professor/turmas');
      setClasses(response.data);
    } catch (error) {
      console.log('Error loading classes', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await deleteToken();
    navigation.replace('Login' as any); // Type hacking for generic auth flow
  };

  const openChangeRoomModal = (classId: string, time: string) => {
    setSelectedClassId(classId);
    setSelectedSchedule(time);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: ClassData }) => (
    //Cartão das classes
    <View className="bg-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100">
      <TouchableOpacity className="flex-row justify-between items-center mb-4"
        onPress={() => navigation.navigate('Attendance', { classId: item.id, subjectName: item.subject })}>
        <View className="flex-1 pr-4">
          <Text className="text-xl font-bold text-gray-800">{item.subject}</Text>
          <Text className="text-gray-500 font-medium mt-1">{item.time} - {item.room}</Text>
        </View>

        <Feather name="chevron-right" size={24} color="#94a3b8" />
      </TouchableOpacity>

      {/* Botões para trocar de sala ou aula EAD */}
      <View className="flex-row justify-between mt-2">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-gray-50 py-3 rounded-lg border border-gray-200 mr-2"
          onPress={() => openChangeRoomModal(item.id, item.time)}
        >
          <Feather name="map" size={16} color="#64748b" />
          <Text className="text-gray-600 font-bold ml-2 text-xs">Trocar Sala</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-sky-50 py-3 rounded-lg border border-sky-200"
          onPress={() => navigation.navigate('ManualAttendance', { classId: item.id, subjectName: item.subject })}
        >
          <Feather name="video" size={16} color="#0ea5e9" />
          <Text className="text-sky-600 font-bold ml-2 text-xs">Aula EAD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 pt-14 px-4">
      {/* Cabeçalho com título e botão de sair */}
      <ScreenHeader
        title="Minhas Turmas"
        subtitle="Selecione uma turma para ver a presença de hoje."
        rightButton={{
          label: 'Sair',
          onPress: handleLogout,
          variant: 'danger'
        }}
      />

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhuma turma cadastrada." />}
      />

      {/* Modal para trocar de sala */}
      <ChangeRoomModal
        visible={modalVisible}
        classId={selectedClassId}
        scheduleTime={selectedSchedule}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadClasses()}
      />
    </View>
  );
}
