import React from 'react';
import { View, FlatList } from 'react-native';
import { useStudentHome } from '../../hooks/useStudentHome';
import ClassCard from '../../components/ClassCard';
import ScreenHeader from '../../components/ScreenHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import EmptyState from '../../components/EmptyState';

type Props = {
  navigation: any; // Type hacking para simplificar navegação aninhada
};

export default function HomeScreen({ navigation }: Props) {
  const { classes, loadingInitial, processingId, handleConfirmAttendance } = useStudentHome();

  if (loadingInitial) return <LoadingOverlay message="Buscando aulas de hoje..." />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900 pt-14 px-4">
      <ScreenHeader
        title="Aulas de Hoje"
        rightButton={{
          icon: 'settings',
          onPress: () => navigation.navigate('Privacy'),
          variant: 'info'
        }}
      />

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ClassCard
            aula={item}
            onConfirm={handleConfirmAttendance}
            isLoading={processingId === item.id}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<EmptyState message="Nenhuma aula programada para hoje." />}
      />
    </View>
  );
}
