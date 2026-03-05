import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export default function ModeSelectScreen() {
  const router = useRouter();
  const colors = useColors();

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      {/* Decorative circles */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: -80, right: -100, opacity: 0.06 }}
      >
        <Svg width={360} height={360} viewBox="0 0 360 360">
          <Circle cx="180" cy="180" r="180" fill="#0a7ea4" />
        </Svg>
      </View>
      <View
        pointerEvents="none"
        style={{ position: "absolute", bottom: 40, left: -120, opacity: 0.04 }}
      >
        <Svg width={300} height={300} viewBox="0 0 300 300">
          <Circle cx="150" cy="150" r="150" fill="#0a7ea4" />
        </Svg>
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 20 }}>
        {/* Header */}
        <View style={{ alignItems: "center", gap: 12, marginBottom: 8 }}>
          <View
            style={{
              borderRadius: 22,
              overflow: "hidden",
              width: 80,
              height: 80,
              shadowColor: "#0a7ea4",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: "700",
                letterSpacing: -0.5,
              }}
            >
              Controle de Gastos
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15, textAlign: "center" }}>
              O que você deseja acessar?
            </Text>
          </View>
        </View>

        {/* Opção 1: Despesas Pessoais */}
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View
            style={{
              backgroundColor: "#0a7ea4",
              borderRadius: 20,
              padding: 24,
              gap: 10,
              shadowColor: "#0a7ea4",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="account-balance-wallet" size={28} color="#fff" />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700", letterSpacing: -0.3 }}>
                Despesas Pessoais
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 18 }}>
                Controle seus gastos do dia a dia, orçamento e histórico financeiro
              </Text>
            </View>
            <View style={{ alignSelf: "flex-end" }}>
              <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        </Pressable>

        {/* Opção 2: Ganhos/Gastos Uber */}
        <Pressable
          onPress={() => router.replace("/uber-earnings")}
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              gap: 10,
              borderWidth: 1.5,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: "rgba(10,126,164,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="directions-car" size={28} color="#0a7ea4" />
            </View>
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 19,
                  fontWeight: "700",
                  letterSpacing: -0.3,
                }}
              >
                Ganhos e Gastos com Uber
              </Text>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18 }}>
                Acompanhe seus resultados como motorista, ganhos e despesas do veículo
              </Text>
            </View>
            <View style={{ alignSelf: "flex-end" }}>
              <MaterialIcons name="arrow-forward" size={20} color={colors.muted} />
            </View>
          </View>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
