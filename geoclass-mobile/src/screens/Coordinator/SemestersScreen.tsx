import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { deleteToken } from '../../services/authStorage';
import { useSemesters } from '../../hooks/useSemesters';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';
import CreateRoomForm from '../../components/CreateRoomForm';

type SemesterData = {
  id: string;
  name: string;
  absencePercentage: number;
};

type Props = {
  navigation: any;
};

export default function SemestersScreen({ navigation }: Props) {
  const {
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
  } = useSemesters();

  const handleLogout = async () => {
    await deleteToken();
    navigation.replace('Login');
  };

  const renderItem = ({ item }: { item: SemesterData }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border border-gray-100 dark:border-slate-700"
      onPress={() => navigation.navigate('StudentsList', { semesterId: item.id })}
    >
      <View className="flex-row items-center">
        <View className="bg-sky-100 p-3 rounded-full mr-4">
          <Feather name="calendar" size={24} color="#0ea5e9" />
        </View>
        <View>
          <Text className="text-lg font-bold text-gray-800 dark:text-slate-100">Semestre {item.name}</Text>
          <Text className="text-gray-500 dark:text-slate-400 mt-1">Clique para ver</Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-xs text-gray-400 mb-1">Faltas Geral</Text>
        <Text className={`text-lg font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.absencePercentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <LoadingOverlay message="Carregando semestres..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}

      <ScreenHeader
        title="Gestão Acadêmica"
        rightButton={{
          label: 'Sair',
          onPress: handleLogout,
          variant: 'danger'
        }}
      />

      <CreateRoomForm
        isOpen={isAccordionOpen}
        onToggle={() => setIsAccordionOpen(!isAccordionOpen)}
        professors={professors}
        onSuccess={loadSemesters}
      />

      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Semestres Ativos</Text>
        <TouchableOpacity
          className="flex-row items-center bg-gray-200 px-3 py-2 rounded-lg"
          onPress={() => setExportModalVisible(true)}
        >
          <Feather name="download" size={16} color="#475569" />
          <Text className="text-slate-600 font-bold ml-2">Exportar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={semesters}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message="Nenhum semestre encontrado." />}
      />

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        title="Exportar Visão Geral"
      />
    </View>
  );
}
