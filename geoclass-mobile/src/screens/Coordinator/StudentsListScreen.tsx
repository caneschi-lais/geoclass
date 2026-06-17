import React from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStudentsList } from '../../hooks/useStudentsList';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';

type StudentData = {
  id: string;
  name: string;
  ra: string;
  absencePercentage: number;
};

type Props = {
  navigation: any;
  route: any;
};

export default function StudentsListScreen({ navigation, route }: Props) {
  const { semesterId } = route.params;
  const {
    students,
    searchQuery,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    activeTab,
    classes,
    handleSearch,
    handleTabSwitch,
    handleExport
  } = useStudentsList(semesterId);

  const renderItem = ({ item }: { item: StudentData }) => (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm flex-row items-center justify-between border border-gray-100 dark:border-slate-700"
      onPress={() => navigation.navigate('StudentSubjects', {
        studentId: item.id,
        studentName: item.name,
        semesterId
      })}
    >
      <View className="flex-row items-center flex-1">
        <View className={`p-3 rounded-full mr-4 ${item.absencePercentage >= 25 ? 'bg-red-100' : 'bg-emerald-100'}`}>
          <Feather name="user" size={24} color={item.absencePercentage >= 25 ? '#ef4444' : '#10b981'} />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-md font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>{item.name}</Text>
          <Text className="text-xs text-gray-500 dark:text-slate-400 mt-1">RA: {item.ra}</Text>
        </View>
      </View>

      <View className="items-end">
        <Text className="text-xs text-gray-400 mb-1">Faltas Totais</Text>
        <Text className={`text-lg font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
          {item.absencePercentage}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderClassItem = ({ item }: { item: any }) => (
    <View className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-gray-100 dark:border-slate-700 flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View className="p-3 rounded-full mr-4 bg-sky-100 dark:bg-sky-900/30">
          <Feather name="book-open" size={24} color="#0284c7" />
        </View>
        <View className="flex-1 pr-2">
          <Text className="text-md font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>
            {item.subject}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Prof. {item.professor.name}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.room_name} • Horário: {item.schedule_time}
          </Text>
        </View>
      </View>
      <View className="bg-gray-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-slate-700/50">
        <Text className="text-xs text-gray-500 dark:text-slate-400 font-bold uppercase">
          {item.total_classes} Aulas
        </Text>
      </View>
    </View>
  );

  if (loading) return <LoadingOverlay message="Carregando dados..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      {exporting && <LoadingOverlay message="Gerando relatório..." />}
      <ScreenHeader
        title={`${semesterId}`}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        rightButton={{
          label: 'Exportar',
          onPress: () => setExportModalVisible(true),
          variant: 'info'
        }}
      />

      <View className="flex-row bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4 border border-gray-200 dark:border-gray-200/20 ">
        <TouchableOpacity
          className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('students')}
        >
          <Text className={`font-bold text-xs ${activeTab === 'students' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Alunos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2.5 rounded-lg items-center ${activeTab === 'classes' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('classes')}
        >
          <Text className={`font-bold text-xs ${activeTab === 'classes' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Matérias & Professores
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-slate-700 flex-row items-center">
        <Feather name="search" size={20} color="#94a3b8" />
        <TextInput
          className="flex-1 ml-2 text-gray-800 dark:text-slate-100 font-medium"
          placeholder={activeTab === 'students' ? "Buscar por RA ou Nome" : "Buscar por Matéria ou Professor"}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={activeTab === 'students' ? students : classes}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'students' ? renderItem : renderClassItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={
              activeTab === 'students'
                ? (searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhum aluno matriculado.')
                : (searchQuery ? 'Nenhuma matéria encontrada.' : 'Nenhuma matéria cadastrada.')
            }
          />
        }
      />

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        title="Exportar Alunos"
      />
    </View>
  );
}
