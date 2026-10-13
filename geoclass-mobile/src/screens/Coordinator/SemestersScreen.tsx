import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { deleteToken } from '../../services/authStorage';
import { useSemesters } from '../../hooks/useSemesters';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';
import ExportModal from '../../components/ExportModal';
import CreateRoomForm from '../../components/CreateRoomForm';
import CreateSubjectForm from '../../components/CreateSubjectForm';
import ConfirmationModal from '../../components/ConfirmationModal';
import HoldButton from '../../components/HoldButton';
import AcademicCalendarModal from '../../components/AcademicCalendarModal';
import CoordinatorAbsenceRequestsModal from '../../components/CoordinatorAbsenceRequestsModal';

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

  const [isSubjectAccordionOpen, setIsSubjectAccordionOpen] = useState(false);
  const [viradaModalVisible, setViradaModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [absenceRequestsModalVisible, setAbsenceRequestsModalVisible] = useState(false);
  const [absenceModalTab, setAbsenceModalTab] = useState<'REQUESTS' | 'DIRECT'>('REQUESTS');

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

      <FlatList
        data={semesters}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-2">
            <ScreenHeader
              title="Gestão Acadêmica"
              rightButton={{
                icon: 'log-out',
                onPress: handleLogout,
                variant: 'white'
              }}
            />

            {/* Card do Semestre Atual Vigente e Ação de Virada (Segurar por 1s) */}
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

              <HoldButton
                onHoldSuccess={() => setViradaModalVisible(true)}
                hintActionText="executar a virada de semestre"
                className="bg-sky-500 active:bg-sky-600 py-2.5 px-4 rounded-lg flex-row items-center justify-center shadow-sm"
              >
                <Feather name="rotate-cw" size={16} color="#ffffff" />
                <Text className="text-white font-bold text-xs ml-2">Executar Virada de Semestre (Segure 1s)</Text>
              </HoldButton>
            </View>

            <CreateRoomForm
              isOpen={isAccordionOpen}
              onToggle={() => {
                setIsAccordionOpen(!isAccordionOpen);
                if (!isAccordionOpen) setIsSubjectAccordionOpen(false);
              }}
              professors={professors}
              onSuccess={loadSemesters}
              currentSemester={currentSemester}
            />

            <CreateSubjectForm
              isOpen={isSubjectAccordionOpen}
              onToggle={() => {
                setIsSubjectAccordionOpen(!isSubjectAccordionOpen);
                if (!isSubjectAccordionOpen) setIsAccordionOpen(false);
              }}
              professors={professors}
              onSuccess={loadSemesters}
              currentSemester={currentSemester}
            />

            {/* Ações da Coordenação (Posicionados acima de Semestres Ativos) */}
            <View className="flex-row gap-2 mb-5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-amber-100 dark:bg-amber-950/40 py-2.5 px-2 rounded-xl border border-amber-300 dark:border-amber-800/50"
                onPress={() => {
                  setAbsenceModalTab('REQUESTS');
                  setAbsenceRequestsModalVisible(true);
                }}
              >
                <Feather name="alert-triangle" size={14} color="#d97706" />
                <Text className="text-amber-800 dark:text-amber-300 font-bold ml-1.5 text-xs">Faltas & Aulas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center bg-rose-100 dark:bg-rose-950/40 py-2.5 px-2 rounded-xl border border-rose-300 dark:border-rose-800/50"
                onPress={() => {
                  setAbsenceModalTab('DIRECT');
                  setAbsenceRequestsModalVisible(true);
                }}
              >
                <Feather name="slash" size={14} color="#e11d48" />
                <Text className="text-rose-800 dark:text-rose-300 font-bold ml-1.5 text-xs">Suspender Aulas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center justify-center bg-gray-200 dark:bg-slate-700 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-slate-600"
                onPress={() => setExportModalVisible(true)}
              >
                <Feather name="download" size={14} color="#475569" />
                <Text className="text-slate-700 dark:text-slate-200 font-bold ml-1.5 text-xs">Exportar</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-3">
              <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">Semestres Ativos</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState message="Nenhum semestre encontrado." />}
      />

      <CoordinatorAbsenceRequestsModal
        visible={absenceRequestsModalVisible}
        initialTab={absenceModalTab}
        onClose={() => setAbsenceRequestsModalVisible(false)}
        onSuccess={loadSemesters}
      />

      <AcademicCalendarModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />

      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
        title="Exportar Visão Geral"
      />

      <ConfirmationModal
        visible={viradaModalVisible}
        title="Virada de Semestre"
        message={`Confirma a virada do semestre letivo (${currentSemester || 'Novo Semestre'})?\n\nTodos os alunos ativos avançarão 1 semestre automaticamente e os concluintes serão atualizados no sistema.`}
        confirmText="Confirmar Virada"
        confirmVariant="warning"
        onConfirm={() => {
          setViradaModalVisible(false);
          handleViradaSemestre();
        }}
        onCancel={() => setViradaModalVisible(false)}
        loading={executingVirada}
      />
    </View>
  );
}
