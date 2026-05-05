import { Platform, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const BANNER_AD_UNIT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER ?? TestIds.ADAPTIVE_BANNER,
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER ?? TestIds.ADAPTIVE_BANNER,
  default: TestIds.ADAPTIVE_BANNER,
});

export function AdBanner() {
  if (Platform.OS === 'web') return null;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
  );
}
