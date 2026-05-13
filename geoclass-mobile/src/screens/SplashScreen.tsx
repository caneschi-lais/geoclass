import React, { useEffect } from 'react';
import { View, Image, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getToken, getRole } from '../services/authStorage';
import { RootStackParamList } from '../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await getToken();
        const role = await getRole();
        
        setTimeout(() => {
          if (token && role) {
            if (role === 'PROFESSOR') navigation.replace('ProfessorApp');
            else if (role === 'COORDENADOR') navigation.replace('CoordinatorApp');
            else navigation.replace('AlunoApp');
          } else {
            navigation.replace('Login');
          }
        }, 2000);

      } catch (error) {
        console.log('Error checking token on splash', error);
        navigation.replace('Login');
      }
    };

    checkAuthStatus();
  }, [navigation]);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Image 
        source={require('../../assets/images/logo.jpg')} 
        className="w-48 h-48 mb-8"
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );
}
