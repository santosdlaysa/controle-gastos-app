import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'uber_feature_enabled';

// In-memory cache + listener set for reactive updates without Context
let _cached: boolean | null = null;
const _listeners = new Set<(enabled: boolean) => void>();

export async function getUberFeatureEnabled(): Promise<boolean> {
  if (_cached !== null) return _cached;
  const val = await AsyncStorage.getItem(KEY);
  // null = never configured → treat as disabled (will be asked on mode-select)
  _cached = val === 'true';
  return _cached;
}

export async function setUberFeatureEnabled(enabled: boolean): Promise<void> {
  _cached = enabled;
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
  _listeners.forEach((fn) => fn(enabled));
}

/** Returns true if the user has never answered the uber question */
export async function isUberFeatureUnconfigured(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEY);
  return val === null;
}

export function subscribeUberFeature(fn: (enabled: boolean) => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
