import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Expense } from '@/types/expense';

// Nota: Funcionalidade de listener de notificações do Nubank desabilitada
// expo-android-notification-listener-service não está disponível no Expo SDK 54

const NUBANK_PACKAGE = 'com.nu.production';

// Stub functions para compatibilidade
async function isNubankAutoTrackEnabled(): Promise<boolean> {
  return false;
}

async function setNubankAutoTrackEnabled(value: boolean): Promise<void> {
  // Stub
}

export function useNubankListener() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastAutoExpense, setLastAutoExpense] = useState<Expense | null>(null);
  const subscriptionRef = useRef<{ remove(): void } | null>(null);

  // Carrega estado salvo
  useEffect(() => {
    isNubankAutoTrackEnabled().then(setIsEnabled);
  }, []);

  // Verifica permissão (apenas Android)
  const checkPermission = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(false);
      return false;
    }

    try {
      // Nota: expo-android-notification-listener-service não está disponível no Expo SDK 54
      setHasPermission(false);
      return false;
    } catch (error) {
      console.warn('Notification listener service not available:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Abre configurações de permissão do Android
  const openPermissionSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return;

    try {
      // Nota: expo-android-notification-listener-service não está disponível no Expo SDK 54
      console.warn('Notification listener service not available');
    } catch (error) {
      console.warn('Could not open notification settings:', error);
    }
  }, []);

  // Toggle enable/disable
  const toggleEnabled = useCallback(async (value: boolean) => {
    await setNubankAutoTrackEnabled(value);
    setIsEnabled(value);
  }, []);

  // Inicia/para o listener
  useEffect(() => {
    if (Platform.OS !== 'android' || !isEnabled) {
      // Limpa subscription se existir
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      return;
    }

    let mounted = true;

    async function startListening() {
      try {
        // Nota: expo-android-notification-listener-service não está disponível no Expo SDK 54
        if (mounted) setHasPermission(false);
      } catch (error) {
        console.warn('Failed to start notification listener:', error);
      }
    }

    startListening();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [isEnabled]);

  // Re-verifica permissão quando o app volta ao foreground
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkPermission();
      }
    });

    // Verifica ao montar
    checkPermission();

    return () => subscription.remove();
  }, [checkPermission]);

  return {
    isEnabled,
    hasPermission,
    lastAutoExpense,
    toggleEnabled,
    openPermissionSettings,
    checkPermission,
  };
}
