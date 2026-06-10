import React from 'react';
import { View, Text, TouchableOpacity, Modal, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'pdf' | 'excel', includeDetails: boolean) => void;
  showDetailsOption?: boolean;
  title?: string;
};

export default function ExportModal({ visible, onClose, onExport, showDetailsOption = true, title = "Exportar Relatório" }: Props) {
  const [includeDetails, setIncludeDetails] = React.useState(false);

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-800 dark:text-slate-100">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {showDetailsOption && (
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-slate-900 p-4 rounded-xl mb-6 border border-gray-100 dark:border-slate-700">
              <View className="flex-1 pr-4">
                <Text className="text-base font-bold text-gray-800 dark:text-slate-100">Incluir detalhes aprofundados</Text>
                <Text className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gera um relatório mais completo (ex: lista todas as matérias de cada aluno).</Text>
              </View>
              <Switch
                value={includeDetails}
                onValueChange={setIncludeDetails}
                trackColor={{ false: '#cbd5e1', true: '#bae6fd' }}
                thumbColor={includeDetails ? '#0ea5e9' : '#f8fafc'}
              />
            </View>
          )}

          <Text className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Escolha o formato</Text>
          
          <View className="flex-row space-x-4 mb-4">
            <TouchableOpacity 
              className="flex-1 bg-red-50 p-4 rounded-xl items-center border border-red-100"
              onPress={() => onExport('pdf', includeDetails)}
            >
              <Feather name="file-text" size={32} color="#ef4444" className="mb-2" />
              <Text className="text-red-600 font-bold mt-2">Documento PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className="flex-1 bg-emerald-50 p-4 rounded-xl items-center border border-emerald-100"
              onPress={() => onExport('excel', includeDetails)}
            >
              <Feather name="file" size={32} color="#10b981" className="mb-2" />
              <Text className="text-emerald-600 font-bold mt-2">Planilha Excel</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}
