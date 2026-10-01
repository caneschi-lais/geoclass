import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useStudentsList, StudentData } from '../../hooks/useStudentsList';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';
import EnrollStudentForm from '../../components/EnrollStudentForm';
import StudentRiskCard from '../../components/StudentRiskCard';
import { StudentRisk } from '../../types';

type Props = {
  navigation: any;
  route: any;
};

export default function StudentsListScreen({ navigation, route }: Props) {
  const { semesterId } = route.params;
  const {
    students,
    riskStudents,
    searchQuery,
    loading,
    exportModalVisible,
    setExportModalVisible,
    exporting,
    activeTab,
    classes,
    handleSearch,
    handleTabSwitch,
    handleExport,
    loadStudents,
    loadClasses,
    toggleUserStatus,
    toggleCourseCompletion
  } = useStudentsList(semesterId);

  const [isEnrollOpen, setIsEnrollOpen] = useState(false);

  const renderItem = ({ item }: { item: StudentData }) => {
    const isInactive = item.active === false;

    return (
      <View className={`bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border ${isInactive ? 'border-red-200 dark:border-red-900/50 bg-red-50/20' : 'border-gray-100 dark:border-slate-700'}`}>
        <TouchableOpacity
          className="flex-row items-center justify-between"
          onPress={() => navigation.navigate('StudentSubjects', {
            studentId: item.id,
            studentName: item.name,
            semesterId
          })}
        >
          <View className="flex-row items-center flex-1">
            <View className={`p-3 rounded-full mr-3 ${isInactive ? 'bg-gray-200 dark:bg-slate-700' : item.absencePercentage >= 25 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <Feather name={isInactive ? "user-x" : "user"} size={22} color={isInactive ? '#94a3b8' : item.absencePercentage >= 25 ? '#ef4444' : '#10b981'} />
            </View>
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text className="text-md font-bold text-gray-800 dark:text-slate-100" numberOfLines={1}>{item.name}</Text>
                {isInactive && (
                  <View className="bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded">
                    <Text className="text-red-700 dark:text-red-400 font-bold text-[10px]">Inativo</Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">RA: {item.ra}</Text>
            </View>
          </View>

          <View className="items-end pl-2">
            <Text className="text-[10px] text-gray-400 mb-0.5">Faltas</Text>
            <Text className={`text-base font-black ${item.absencePercentage >= 25 ? 'text-red-500' : 'text-emerald-500'}`}>
              {item.absencePercentage}%
            </Text>
          </View>
        </TouchableOpacity>

        {/* Linha de Cursos e Ações do Coordenador */}
        <View className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex-row justify-between items-center flex-wrap gap-2">
          {/* Status Ativo / Inativo Toggle */}
          <View className="flex-row items-center gap-2">
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ativo:</Text>
            <Switch
              value={item.active !== false}
              onValueChange={() => toggleUserStatus(item.id, item.active !== false)}
              trackColor={{ false: '#fca5a5', true: '#6ee7b7' }}
              thumbColor={item.active !== false ? '#10b981' : '#ef4444'}
            />
          </View>

          {/* Badges de Cursos e Conclusão */}
          {item.userCourses && item.userCourses.length > 0 && (
            <View className="flex-row flex-wrap items-center gap-1.5">
              {item.userCourses.map(uc => (
                <TouchableOpacity
                  key={uc.course_name}
                  onPress={() => toggleCourseCompletion(item.id, uc.course_name, !!uc.is_completed)}
                  className={`px-2 py-1 rounded-md flex-row items-center gap-1 border ${uc.is_completed ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800' : 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-800'}`}
                >
                  <Feather name={uc.is_completed ? "check-circle" : "book"} size={12} color={uc.is_completed ? "#d97706" : "#0284c7"} />
                  <Text className={`text-[10px] font-bold ${uc.is_completed ? 'text-amber-700 dark:text-amber-400' : 'text-sky-700 dark:text-sky-400'}`}>
                    {uc.course_name} {uc.is_completed ? '(Concluído)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

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

  const renderRiskItem = ({ item }: { item: StudentRisk }) => (
    <StudentRiskCard item={item} />
  );

  if (loading) return <LoadingOverlay message="Carregando dados..." />;

  const getListData = () => {
    if (activeTab === 'students') return students;
    if (activeTab === 'risk') return riskStudents;
    return classes;
  };

  const getRenderItem = () => {
    if (activeTab === 'students') return renderItem;
    if (activeTab === 'risk') return renderRiskItem;
    return renderClassItem;
  };

  const getPlaceholderText = () => {
    if (activeTab === 'students') return "Buscar por RA ou Nome";
    if (activeTab === 'risk') return "Buscar em alunos em risco";
    return "Buscar por Matéria ou Professor";
  };

  const getEmptyMessage = () => {
    if (activeTab === 'students') return searchQuery ? 'Nenhum aluno encontrado.' : 'Nenhum aluno matriculado.';
    if (activeTab === 'risk') return searchQuery ? 'Nenhum aluno em risco encontrado.' : 'Nenhum aluno em risco de reprovação no momento!';
    return searchQuery ? 'Nenhuma matéria encontrada.' : 'Nenhuma matéria cadastrada.';
  };

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

      <EnrollStudentForm
        isOpen={isEnrollOpen}
        onToggle={() => setIsEnrollOpen(!isEnrollOpen)}
        classes={classes}
        onSuccess={() => {
          loadStudents();
          loadClasses();
        }}
      />

      <View className="flex-row bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-4 border border-gray-200 dark:border-gray-200/20">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('students')}
        >
          <Text className={`font-bold text-[11px] ${activeTab === 'students' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Alunos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'risk' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('risk')}
        >
          <Text className={`font-bold text-[11px] ${activeTab === 'risk' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
            Alunos em Risco
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'classes' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          onPress={() => handleTabSwitch('classes')}
        >
          <Text className={`font-bold text-[11px] ${activeTab === 'classes' ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
            Matérias
          </Text>
        </TouchableOpacity>
      </View>

      <View className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-4 border border-gray-200 dark:border-slate-700 flex-row items-center">
        <Feather name="search" size={20} color="#94a3b8" />
        <TextInput
          className="flex-1 ml-2 text-gray-800 dark:text-slate-100 font-medium"
          placeholder={getPlaceholderText()}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={getListData()}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={getRenderItem() as any}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState message={getEmptyMessage()} />}
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
