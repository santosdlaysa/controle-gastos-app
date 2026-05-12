import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { usePurchases } from '@/hooks/use-purchases';

const BANNER_AD_UNIT_ID = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER ?? TestIds.ADAPTIVE_BANNER,
  android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER ?? TestIds.ADAPTIVE_BANNER,
  default: TestIds.ADAPTIVE_BANNER,
});

export function AdBanner() {
  const colors = useColors();
  const { packages, purchasing, purchase, restore, loading: purchasesLoading } = usePurchases();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  if (Platform.OS === 'web') return null;

  return (
    <>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 6 }}>
        <BannerAd
          unitId={BANNER_AD_UNIT_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
        <Pressable
          onPress={() => setPremiumModalVisible(true)}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10 }}>
            <MaterialIcons name="star" size={13} color="#F59E0B" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B' }}>
              Remover anúncios
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Modal Premium */}
      <Modal
        visible={premiumModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}
          onPress={() => setPremiumModalVisible(false)}
        >
          <Pressable onPress={() => {}}>
            <View style={{ backgroundColor: colors.background, borderRadius: 24, overflow: 'hidden' }}>
              {/* Header gradiente */}
              <View style={{ backgroundColor: '#0c3a5e', padding: 28, alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(245,158,11,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(245,158,11,0.3)',
                }}>
                  <MaterialIcons name="workspace-premium" size={34} color="#F59E0B" />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', letterSpacing: -0.3 }}>
                  Remover Anúncios
                </Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 20 }}>
                  Aproveite o app sem interrupções
                </Text>
              </View>

              {/* Benefícios */}
              <View style={{ padding: 24, gap: 14 }}>
                <BenefitRow
                  icon="block"
                  color="#EF4444"
                  text="Sem banners de anúncio"
                  colors={colors}
                />
                <BenefitRow
                  icon="speed"
                  color="#10B981"
                  text="Experiência mais rápida e limpa"
                  colors={colors}
                />
                <BenefitRow
                  icon="autorenew"
                  color="#6366F1"
                  text="Assinatura mensal — cancele quando quiser"
                  colors={colors}
                />
                <BenefitRow
                  icon="favorite"
                  color="#EC4899"
                  text="Apoie o desenvolvimento do app"
                  colors={colors}
                />
              </View>

              {/* Botões */}
              <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 10 }}>
                {purchasesLoading ? (
                  <View style={{ backgroundColor: '#F59E0B', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : packages.length > 0 ? (
                  packages.map((pkg) => (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => purchase(pkg)}
                      disabled={purchasing}
                      style={({ pressed }) => [{
                        opacity: (pressed || purchasing) ? 0.7 : 1,
                      }]}
                    >
                      <View style={{
                        backgroundColor: '#F59E0B',
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        shadowColor: '#F59E0B',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}>
                        {purchasing ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <MaterialIcons name="star" size={20} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                              Assinar por {pkg.product.priceString}/mês
                            </Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <View style={{
                    backgroundColor: '#F59E0B',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    opacity: 0.5,
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                      Indisponível no momento
                    </Text>
                  </View>
                )}

                {/* Restaurar compra */}
                <Pressable
                  onPress={restore}
                  disabled={purchasing}
                  style={({ pressed }) => [{ opacity: (pressed || purchasing) ? 0.6 : 1 }]}
                >
                  <View style={{
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}>
                    <MaterialIcons name="restore" size={18} color={colors.muted} />
                    <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>
                      Restaurar compra anterior
                    </Text>
                  </View>
                </Pressable>

                {/* Fechar */}
                <Pressable
                  onPress={() => setPremiumModalVisible(false)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingVertical: 8, alignItems: 'center' }]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>
                    Agora não
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function BenefitRow({ icon, color, text, colors }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  text: string;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: color + '15',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 }}>
        {text}
      </Text>
      <MaterialIcons name="check-circle" size={18} color="#10B981" />
    </View>
  );
}
