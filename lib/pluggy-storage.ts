import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PluggyConnection } from '@/types/pluggy';

const PLUGGY_ENABLED_KEY = 'pluggy_enabled';
const PLUGGY_CONNECTIONS_KEY = 'pluggy_connections';
const PLUGGY_LAST_SYNC_KEY = 'pluggy_last_sync';

// --- Toggle ---
export async function isPluggyEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PLUGGY_ENABLED_KEY);
  return val === 'true';
}

export async function setPluggyEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PLUGGY_ENABLED_KEY, enabled ? 'true' : 'false');
}

// --- Conexões ---
export async function getPluggyConnections(): Promise<PluggyConnection[]> {
  const data = await AsyncStorage.getItem(PLUGGY_CONNECTIONS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addPluggyConnection(conn: PluggyConnection): Promise<void> {
  const existing = await getPluggyConnections();
  if (existing.some(c => c.itemId === conn.itemId)) return;
  existing.push(conn);
  await AsyncStorage.setItem(PLUGGY_CONNECTIONS_KEY, JSON.stringify(existing));
}

export async function removePluggyConnection(itemId: string): Promise<void> {
  const existing = await getPluggyConnections();
  const filtered = existing.filter(c => c.itemId !== itemId);
  await AsyncStorage.setItem(PLUGGY_CONNECTIONS_KEY, JSON.stringify(filtered));
}

// --- Última sincronização ---
export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(PLUGGY_LAST_SYNC_KEY);
}

export async function setLastSyncTime(isoDate: string): Promise<void> {
  await AsyncStorage.setItem(PLUGGY_LAST_SYNC_KEY, isoDate);
}
