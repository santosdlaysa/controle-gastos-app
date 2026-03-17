import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const ICON: Record<ToastType, string> = {
  success: 'check-circle',
  error: 'error',
  info: 'info',
};

const BG: Record<ToastType, string> = {
  success: '#10B981',
  error: '#EF4444',
  info: '#0a7ea4',
};

export function Toast({ message, type, visible }: ToastState) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible && !message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        opacity,
        zIndex: 999,
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: BG[type],
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      }}>
        <MaterialIcons name={ICON[type] as any} size={20} color="#fff" />
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#fff' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show(message: string, type: ToastType = 'success') {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, visible: true });
    timerRef.current = setTimeout(() => {
      setToast(t => ({ ...t, visible: false }));
    }, 2600);
  }

  return { toast, show };
}
