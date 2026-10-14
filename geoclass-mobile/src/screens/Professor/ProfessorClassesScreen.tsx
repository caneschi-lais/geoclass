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
import ProfessorAbsenceHistoryModal from '../../components/ProfessorAbsenceHistoryModal';

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
  const [absenceHistoryVisible, setAbsenceHistoryVisible] = useState(false);
  const [pendingCertificatesCount, setPendingCertificatesCount] = useState(0);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await api.get('/professor/turmas');
      setClasses(response.data);

      try {
        const absRes = await api.get('/professor/minhas-ausencias');
        const list = absRes.data || [];
        const pendingCount = list.filter((a: any) => !a.certificate_url && a.reason_type === 'SAUDE').length;
        setPendingCertificatesCount(pendingCount);
      } catch (e) {}
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
          <Text numberOfLines={1} className="text-gray-600 dark:text-slate-300 font-bold ml-1 text-xs">Trocar Sala</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center bg-sky-50 dark:bg-sky-950/30 py-2.5 rounded-lg border border-sky-200 dark:border-sky-800/60 mr-1.5"
          onPress={() => navigation.navigate('ManualAttendance', { classId: item.id, subjectName: item.subject })}
        >
          <Feather name="user-check" size={14} color="#0284c7" />
          <Text numberOfLines={1} className="text-sky-700 dark:text-sky-300 font-bold ml-1 text-xs">Presença</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSelectedAbsenceClass({ id: item.id, subject: item.subject });
            setAbsenceModalVisible(true);
          }}
          className="flex-1 flex-row items-center justify-center bg-red-50 dark:bg-red-950/30 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60"
        >
          <Feather name="alert-circle" size={14} color="#ef4444" />
          <Text numberOfLines={1} className="text-red-600 dark:text-red-400 font-bold ml-1 text-xs">Avisar Falta</Text>
        </TouchableOpacity>
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

      <View className="flex-row gap-2 mb-4">
        {/* Reposições de Aula */}
        <TouchableOpacity
          onPress={() => setReplacementModalVisible(true)}
          className="flex-1 flex-row items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-3 rounded-xl shadow-sm"
        >
          <View className="flex-row items-center flex-1 pr-1">
            <View className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-lg mr-2">
              <Feather name="check-square" size={16} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-xs font-bold uppercase text-amber-800 dark:text-amber-400">Reposições</Text>
              <Text numberOfLines={1} className="text-[10px] text-amber-700 dark:text-amber-500 font-medium">Chamadas</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={14} color="#d97706" />
        </TouchableOpacity>

        {/* Minhas Ausências & Atestados */}
        <TouchableOpacity
          onPress={() => setAbsenceHistoryVisible(true)}
          className="flex-1 flex-row items-center justify-between bg-sky-50 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800/60 p-3 rounded-xl shadow-sm relative"
        >
          {pendingCertificatesCount > 0 && (
            <View className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full px-1.5 py-0.5 border-2 border-white dark:border-slate-800 z-10">
              <Text className="text-white text-[9px] font-extrabold">{pendingCertificatesCount}</Text>
            </View>
          )}
          <View className="flex-row items-center flex-1 pr-1">
            <View className="bg-sky-100 dark:bg-sky-900/50 p-2 rounded-lg mr-2">
              <Feather name="file-text" size={16} color="#0ea5e9" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-xs font-bold uppercase text-sky-800 dark:text-sky-300">Atestados</Text>
              <Text numberOfLines={1} className="text-[10px] text-sky-700 dark:text-sky-400 font-medium">Minhas Faltas</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={14} color="#0ea5e9" />
        </TouchableOpacity>
      </View>

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

      <ProfessorAbsenceHistoryModal
        visible={absenceHistoryVisible}
        onClose={() => setAbsenceHistoryVisible(false)}
        onSuccess={() => loadClasses()}
      />
    </View>
  );
}
