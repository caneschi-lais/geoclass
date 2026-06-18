import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Notification } from '../types';

type Props = {
  visible: boolean;
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id?: string) => Promise<void>;
};

function formatNotificationDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} às ${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

export default function NotificationsModal({ visible, notifications, onClose, onMarkAsRead }: Props) {
  if (!visible) return null;

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/55">
        <View className="bg-white dark:bg-slate-800 rounded-t-3xl p-6 min-h-[50%] max-h-[85%] shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <View className="flex-row items-center gap-2">
              <Feather name="bell" size={22} color="#0284c7" />
              <Text className="text-xl font-extrabold text-gray-800 dark:text-slate-100">Notificações</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full">
              <Feather name="x" size={18} color="#64748b" className="dark:text-slate-300" />
            </TouchableOpacity>
          </View>

          {/* Marcar todas como lidas */}
          {hasUnread && (
            <TouchableOpacity
              onPress={() => onMarkAsRead()}
              className="bg-sky-50 dark:bg-sky-950/40 py-2.5 px-4 rounded-xl mb-4 border border-sky-100 dark:border-sky-900/30 items-center flex-row justify-center gap-2"
            >
              <Feather name="check-square" size={15} color="#0369a1" />
              <Text className="text-sky-700 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
                Marcar todas como lidas
              </Text>
            </TouchableOpacity>
          )}

          {/* List/Content */}
          {notifications.length === 0 ? (
            <View className="py-16 items-center justify-center bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800">
              <View className="p-4 bg-sky-50 dark:bg-sky-950/20 rounded-full mb-3">
                <Feather name="bell-off" size={28} color="#0ea5e9" />
              </View>
              <Text className="text-gray-800 dark:text-slate-200 font-extrabold text-base">Sem Notificações</Text>
              <Text className="text-gray-500 dark:text-slate-400 text-center text-xs mt-1 px-6">
                Você está em dia com seus avisos e alertas do GeoClass.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={item.read ? 1 : 0.7}
                  onPress={() => {
                    if (!item.read) {
                      onMarkAsRead(item.id);
                    }
                  }}
                  className={`p-4 rounded-2xl mb-2.5 flex-row gap-3 border ${
                    item.read
                      ? 'bg-gray-50/50 dark:bg-slate-900/30 border-gray-100 dark:border-slate-800/60'
                      : 'bg-white dark:bg-slate-900 border-sky-100 dark:border-sky-950/50 shadow-sm shadow-sky-500/5'
                  }`}
                >
                  {/* Status Indicator */}
                  <View className="pt-1">
                    {item.read ? (
                      <View className="p-1.5 bg-gray-100 dark:bg-slate-800 rounded-full">
                        <Feather name="mail" size={13} color="#94a3b8" />
                      </View>
                    ) : (
                      <View className="p-1.5 bg-sky-100 dark:bg-sky-950 rounded-full relative">
                        <Feather name="mail" size={13} color="#0ea5e9" />
                        <View className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-slate-900" />
                      </View>
                    )}
                  </View>

                  {/* Body Text */}
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text
                        className={`text-sm flex-1 mr-2 ${
                          item.read
                            ? 'font-semibold text-gray-700 dark:text-slate-300'
                            : 'font-extrabold text-gray-900 dark:text-slate-100'
                        }`}
                      >
                        {item.title}
                      </Text>
                      <Text className="text-[10px] text-gray-400 dark:text-slate-500">
                        {formatNotificationDate(item.created_at)}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                      {item.body}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
