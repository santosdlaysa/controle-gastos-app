import AsyncStorage from '@react-native-async-storage/async-storage';

const NUBANK_AUTO_TRACK_KEY = 'nubank_auto_track_enabled';

export async function isNubankAutoTrackEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NUBANK_AUTO_TRACK_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setNubankAutoTrackEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NUBANK_AUTO_TRACK_KEY, enabled ? 'true' : 'false');
}
