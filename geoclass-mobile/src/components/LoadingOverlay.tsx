import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

type Props = {
  message?: string;
};

export default function LoadingOverlay({ message }: Props) {
  return (
    <View className="flex-1 justify-center items-center bg-gray-50">
      <ActivityIndicator size="large" color="#0ea5e9" />
      {message && (
        <Text className="mt-4 text-gray-500 font-medium">{message}</Text>
      )}
    </View>
  );
}
