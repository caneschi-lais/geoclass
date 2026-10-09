import React, { useRef, useState } from 'react';
import { TouchableOpacity, TouchableOpacityProps, Platform, Alert } from 'react-native';

interface HoldButtonProps extends TouchableOpacityProps {
  onHoldSuccess: () => void;
  hintActionText: string;
  holdTimeMs?: number;
  children: React.ReactNode;
}

export default function HoldButton({
  onHoldSuccess,
  hintActionText,
  holdTimeMs = 1000,
  children,
  className,
  style,
  ...props
}: HoldButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCompletedRef = useRef(false);
  const [holding, setHolding] = useState(false);

  const handlePressIn = () => {
    isCompletedRef.current = false;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      isCompletedRef.current = true;
      setHolding(false);
      onHoldSuccess(); // Dispara abertura do modal de confirmação após 1 segundo
    }, holdTimeMs);
  };

  const handlePressOut = () => {
    setHolding(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    // Se não segurou por 1s, exibe aviso e NÃO faz nenhuma atualização
    if (!isCompletedRef.current) {
      const msg = `Mantenha o botão pressionado por 1 segundo para ${hintActionText}.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Instrução de Segurança', msg);
      }
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleClick}
      style={style}
      className={`${className || ''} ${holding ? 'opacity-70 scale-95' : ''}`}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
