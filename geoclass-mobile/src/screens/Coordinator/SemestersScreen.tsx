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
    currentSemester,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    executingVirada,
    isAccordionOpen,
    setIsAccordionOpen,
    professors,
    loadSemesters,
    handleViradaSemestre,
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
      {executingVirada && <LoadingOverlay message="Processando virada de semestre..." />}

      <ScreenHeader
        title="Gestão Acadêmica"
        rightButton={{
          icon: 'log-out',
          onPress: handleLogout,
          variant: 'white'
        }}
      />

      {/* Card do Semestre Atual Vigente e Ação de Virada */}
      <View className="bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-4 rounded-xl mb-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <View className="bg-sky-500 p-1.5 rounded-lg mr-2">
              <Feather name="clock" size={16} color="#ffffff" />
            </View>
            <Text className="text-sky-900 dark:text-sky-200 font-bold text-sm">
              Semestre Vigente: <Text className="font-extrabold text-sky-600 dark:text-sky-400">{currentSemester || 'Carregando...'}</Text>
            </Text>
          </View>
        </View>

        <Text className="text-gray-600 dark:text-slate-400 text-xs mb-3">
          Detectado automaticamente pela data atual do servidor.
        </Text>

        <TouchableOpacity
          className="bg-sky-500 active:bg-sky-600 py-2.5 px-4 rounded-lg flex-row items-center justify-center shadow-sm"
          onPress={handleViradaSemestre}
        >
          <Feather name="rotate-cw" size={16} color="#ffffff" />
          <Text className="text-white font-bold text-xs ml-2">Executar Virada de Semestre (Batch)</Text>
        </TouchableOpacity>
      </View>

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
