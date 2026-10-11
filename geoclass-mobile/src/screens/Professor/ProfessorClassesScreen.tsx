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
import HoldButton from '../../components/HoldButton';
import ProfessorAbsenceModal from '../../components/ProfessorAbsenceModal';
import ReplacementAttendanceModal from '../../components/ReplacementAttendanceModal';

type Props = {
  navigation: NativeStackNavigationProp<ProfessorStackParamList, 'Classes'>;
};

export default function ProfessorClassesScreen({ navigation }: Props) {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');

  // Modais de Ausência e Reposição
  const [absenceModalVisible, setAbsenceModalVisible] = useState(false);
  const [selectedAbsenceClass, setSelectedAbsenceClass] = useState<{ id: string; subject: string }>({ id: '', subject: '' });
  const [replacementModalVisible, setReplacementModalVisible] = useState(false);

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
    <View className="bg-white dark:bg-slate-800 rounded-xl p-5 mb-4 shadow-sm border border-gray-100 dark:border-slate-700">
      <TouchableOpacity className="flex-row justify-between items-center mb-3"
        onPress={() => navigation.navigate('Attendance', { classId: item.id, subjectName: item.subject })}>
        <View className="flex-1 pr-4">
          <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">{item.subject}</Text>
          <Text className="text-gray-500 dark:text-slate-400 font-medium mt-1">{item.time} - {item.room}</Text>
          <Text className='text-gray-500 dark:text-slate-400 font-medium mt-1'>Alunos: {item.enrolledCount}</Text>
        </View>

        <Feather name="chevron-right" size={24} color="#94a3b8" />
      </TouchableOpacity>

      <View className="flex-row justify-between mt-1">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-gray-50 dark:bg-slate-900 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 mr-1.5"
          onPress={() => openChangeRoomModal(item.id, item.time)}
        >
          <Feather name="map" size={14} color="#64748b" />
          <Text className="text-gray-600 dark:text-slate-300 font-bold ml-1 text-xs">Trocar Sala</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-gray-50 dark:bg-slate-900 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 mr-1.5"
          onPress={() => navigation.navigate('ManualAttendance', { classId: item.id, subjectName: item.subject })}
        >
          <Feather name="user-check" size={14} color="#0ea5e9" />
          <Text className="text-sky-600 font-bold ml-1 text-xs">Presença Manual</Text>
        </TouchableOpacity>

        <HoldButton
          holdTimeMs={1000}
          hintActionText="abrir o formulário de ausência"
          onHoldSuccess={() => {
            setSelectedAbsenceClass({ id: item.id, subject: item.subject });
            setAbsenceModalVisible(true);
          }}
          className="flex-1 flex-row items-center justify-center bg-red-50 dark:bg-red-950/30 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60"
        >
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text className="text-red-600 dark:text-red-400 font-bold ml-1 text-xs">Avisar Falta</Text>
        </HoldButton>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      <ScreenHeader
        title="Minhas Turmas"
        subtitle=""
        rightButton={{
          icon: 'log-out',
          onPress: handleLogout,
          variant: 'danger'
        }}
      />

      <TouchableOpacity
        onPress={() => setReplacementModalVisible(true)}
        className="flex-row items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-3 rounded-xl mb-4 shadow-sm"
      >
        <View className="flex-row items-center">
          <View className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg mr-3">
            <Feather name="check-square" size={18} color="#d97706" />
          </View>
          <View>
            <Text className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">Reposições de Aula</Text>
            <Text className="text-[11px] text-amber-700 dark:text-amber-500 font-medium">Realizar chamada da reposição (Checkboxes)</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color="#d97706" />
      </TouchableOpacity>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhuma turma cadastrada." />}
      />

      <ChangeRoomModal
        visible={modalVisible}
        classId={selectedClassId}
        scheduleTime={selectedSchedule}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadClasses()}
      />

      <ProfessorAbsenceModal
        visible={absenceModalVisible}
        classId={selectedAbsenceClass.id}
        subjectName={selectedAbsenceClass.subject}
        onClose={() => setAbsenceModalVisible(false)}
        onSuccess={() => loadClasses()}
      />

      <ReplacementAttendanceModal
        visible={replacementModalVisible}
        onClose={() => setReplacementModalVisible(false)}
        onSuccess={() => loadClasses()}
      />
    </View>
  );
}
