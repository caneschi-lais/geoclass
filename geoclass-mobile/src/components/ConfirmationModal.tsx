import React from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmationModalProps) {
  if (!visible) return null;

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'danger':
        return {
          bg: 'bg-red-500 active:bg-red-600',
          iconName: 'alert-triangle' as const,
          iconColor: '#ef4444',
          iconBg: 'bg-red-100 dark:bg-red-950/50',
        };
      case 'warning':
        return {
          bg: 'bg-amber-500 active:bg-amber-600',
          iconName: 'alert-circle' as const,
          iconColor: '#f59e0b',
          iconBg: 'bg-amber-100 dark:bg-amber-950/50',
        };
      case 'success':
        return {
          bg: 'bg-emerald-500 active:bg-emerald-600',
          iconName: 'check-circle' as const,
          iconColor: '#10b981',
          iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
        };
      default:
        return {
          bg: 'bg-sky-500 active:bg-sky-600',
          iconName: 'help-circle' as const,
          iconColor: '#0ea5e9',
          iconBg: 'bg-sky-100 dark:bg-sky-950/50',
        };
    }
  };

  const variant = getVariantStyles();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-5">
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-gray-100 dark:border-slate-700 items-center">
          
          <View className={`p-3 rounded-full mb-4 ${variant.iconBg}`}>
            <Feather name={variant.iconName} size={28} color={variant.iconColor} />
          </View>

          <Text className="text-xl font-bold text-gray-800 dark:text-slate-100 text-center mb-2">
            {title}
          </Text>

          <Text className="text-sm text-gray-600 dark:text-slate-300 text-center mb-6 leading-relaxed">
            {message}
          </Text>

          <View className="flex-row gap-3 w-full">
            <TouchableOpacity
              disabled={loading}
              onPress={onCancel}
              className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 items-center justify-center border border-gray-200 dark:border-slate-600"
            >
              <Text className="text-gray-700 dark:text-slate-200 font-bold text-sm">
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              onPress={onConfirm}
              className={`flex-1 py-3 rounded-xl items-center justify-center flex-row ${variant.bg}`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-sm">{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
