import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useAuthContext } from "@/lib/auth-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type Mode = "login" | "register";

const BRAND = "#0a7ea4";
const BRAND_DARK = "#065a78";

function haptic(style: "light" | "error" = "light") {
  if (Platform.OS === "web") return;
  if (style === "error") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const { applyLogin } = useAuthContext();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError("Preencha email e senha.");
      haptic("error");
      return;
    }

    haptic();
    setLoading(true);
    try {
      const result =
        mode === "login"
          ? await Api.login(email.trim(), password)
          : await Api.register(email.trim(), password);

      await Auth.setSessionToken(result.token);

      // Seta o usuário diretamente a partir da resposta do login,
      // sem chamar getMe() para evitar falhas de autenticação no servidor
      await applyLogin(result.user);
    } catch (err) {
      haptic("error");
      const msg = err instanceof Error ? err.message : String(err);
      // Traduzir mensagens técnicas em mensagens amigáveis
      if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("invalid")) {
        setError("Email ou senha incorretos.");
      } else if (msg.includes("does not exist") || msg.includes("not found") || msg.includes("404")) {
        setError("Email ou senha incorretos.");
      } else if (msg.includes("timeout") || msg.includes("abort")) {
        setError("Servidor demorou para responder. Tente novamente.");
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) {
        setError("Sem conexão com o servidor. Verifique sua internet.");
      } else {
        setError(msg || "Erro ao autenticar.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    if (next === mode || loading) return;
    haptic();
    setMode(next);
    setError(null);
  };

  const inputBorder = (field: "email" | "password") =>
    error && !loading ? colors.error : focused === field ? BRAND : colors.border;

  const cardBg = isDark ? colors.surface : colors.background;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero ─────────────────────────────────────────────── */}
          <View
            style={{
              paddingTop: insets.top + 36,
              paddingBottom: 72,
              alignItems: "center",
              borderBottomLeftRadius: 36,
              borderBottomRightRadius: 36,
              overflow: "hidden",
              // Cor sólida de base: garante o texto branco legível mesmo se o SVG não renderizar
              backgroundColor: BRAND,
            }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setHeroSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
            }}
          >
            {heroSize.width > 0 && (
            <Svg style={{ position: "absolute", top: 0, left: 0 }} width={heroSize.width} height={heroSize.height}>
              <Defs>
                <LinearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={BRAND} />
                  <Stop offset="1" stopColor={BRAND_DARK} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={heroSize.width} height={heroSize.height} fill="url(#hero)" />
              <Circle cx={heroSize.width * 0.88} cy={heroSize.height * 0.08} r={120} fill="#ffffff" opacity={0.07} />
              <Circle cx={heroSize.width * 0.06} cy={heroSize.height * 0.92} r={90} fill="#ffffff" opacity={0.06} />
            </Svg>
            )}

            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.35)",
              }}
            >
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            </View>

            <Text
              style={{
                color: "#ffffff",
                fontSize: 32,
                fontWeight: "800",
                letterSpacing: -0.8,
                marginTop: 16,
              }}
            >
              Orgenyx
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 14, marginTop: 4 }}>
              Suas finanças, mês a mês, sob controle.
            </Text>
          </View>

          {/* ── Card ─────────────────────────────────────────────── */}
          <View
            style={{
              marginTop: -44,
              marginHorizontal: 20,
              backgroundColor: cardBg,
              borderRadius: 24,
              padding: 20,
              gap: 16,
              borderWidth: isDark ? 1 : 0,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDark ? 0 : 0.08,
              shadowRadius: 24,
              elevation: isDark ? 0 : 6,
            }}
          >
            {/* Segmented: Entrar / Criar conta */}
            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: "row",
                backgroundColor: isDark ? colors.background : colors.surface,
                borderRadius: 14,
                padding: 4,
              }}
            >
              {(["login", "register"] as const).map((m) => {
                const active = mode === m;
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => switchMode(m)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 11,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? cardBg : "transparent",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: active && !isDark ? 0.08 : 0,
                      shadowRadius: 3,
                      elevation: active && !isDark ? 1 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: active ? "700" : "500",
                        color: active ? colors.foreground : colors.muted,
                      }}
                    >
                      {m === "login" ? "Entrar" : "Criar conta"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: colors.muted, fontSize: 13, textAlign: "center", marginTop: -4 }}>
              {mode === "login"
                ? "Bem-vindo de volta! Acesse sua conta."
                : "Crie sua conta gratuitamente em segundos."}
            </Text>

            {/* Error */}
            {error && (
              <View
                accessibilityLiveRegion="polite"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: colors.error + "18",
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <MaterialIcons name="error-outline" size={18} color={colors.error} />
                <Text style={{ color: colors.error, fontSize: 13, flex: 1 }}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Email</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 52,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: inputBorder("email"),
                  backgroundColor: isDark ? colors.background : colors.surface,
                  paddingHorizontal: 14,
                  gap: 10,
                }}
              >
                <MaterialIcons
                  name="mail-outline"
                  size={20}
                  color={focused === "email" ? BRAND : colors.muted}
                />
                <TextInput
                  style={{ flex: 1, height: "100%", fontSize: 15, color: colors.foreground }}
                  placeholder="seu@email.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType={mode === "register" ? "username" : "emailAddress"}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  submitBehavior="submit"
                  editable={!loading}
                  accessibilityLabel="Email"
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>Senha</Text>
                {mode === "login" && (
                  <Pressable
                    onPress={() => router.push("/forgot-password")}
                    disabled={loading}
                    hitSlop={10}
                  >
                    <Text style={{ color: BRAND, fontSize: 13, fontWeight: "600" }}>Esqueceu a senha?</Text>
                  </Pressable>
                )}
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  height: 52,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: inputBorder("password"),
                  backgroundColor: isDark ? colors.background : colors.surface,
                  paddingLeft: 14,
                  gap: 10,
                }}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={focused === "password" ? BRAND : colors.muted}
                />
                <TextInput
                  ref={passwordRef}
                  style={{ flex: 1, height: "100%", fontSize: 15, color: colors.foreground }}
                  placeholder={mode === "register" ? "Mínimo 8 caracteres" : "Sua senha"}
                  placeholderTextColor={colors.muted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  textContentType={mode === "register" ? "newPassword" : "password"}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  editable={!loading}
                  accessibilityLabel="Senha"
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{ height: "100%", paddingHorizontal: 14, justifyContent: "center" }}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
              {mode === "register" && (
                <Text
                  style={{
                    fontSize: 12,
                    color: password.length >= 8 ? colors.success : colors.muted,
                  }}
                >
                  {password.length >= 8 ? "✓ Senha com tamanho suficiente" : "Use pelo menos 8 caracteres"}
                </Text>
              )}
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: 16,
                backgroundColor: BRAND,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                marginTop: 4,
                opacity: loading ? 0.8 : 1,
                transform: [{ scale: pressed && !loading ? 0.98 : 1 }],
                shadowColor: BRAND,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              })}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>
                    {mode === "login" ? "Entrar" : "Criar conta"}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", paddingTop: 24, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialIcons name="lock" size={14} color={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>Conexão segura</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
