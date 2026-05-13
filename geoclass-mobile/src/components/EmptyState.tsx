import React from 'react';
import { Text } from 'react-native';

type Props = {
  message: string;
};

export default function EmptyState({ message }: Props) {
  return (
    <Text className="text-center text-gray-500 mt-10">
      {message}
    </Text>
  );
}
