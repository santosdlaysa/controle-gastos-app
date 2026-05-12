import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useAuthContext } from "@/lib/auth-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";

type Mode = "login" | "register";

export default function LoginScreen() {
  const router = useRouter();
  const { applyLogin } = useAuthContext();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError("Preencha email e senha.");
      return;
    }

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

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Hero */}
        <View className="flex-1 justify-center items-center px-8 gap-6">
          <View
            style={{
              borderRadius: 24,
              overflow: "hidden",
              width: 88,
              height: 88,
              shadowColor: "#0a7ea4",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 10,
            }}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={{ width: 88, height: 88 }}
              resizeMode="cover"
            />
          </View>

          <View className="items-center" style={{ gap: 8 }}>
            <Text
              className="text-foreground font-bold"
              style={{ fontSize: 32, letterSpacing: -0.8 }}
            >
              Orgenyx
            </Text>
            <View
              style={{
                backgroundColor: "rgba(10,126,164,0.12)",
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: "rgba(10,126,164,0.2)",
              }}
            >
              <Text style={{ color: "#0a7ea4", fontSize: 12, fontWeight: "600", letterSpacing: 0.6 }}>
                CONTROLE DE GASTOS
              </Text>
            </View>
            <Text className="text-muted text-sm text-center" style={{ marginTop: 4 }}>
              {mode === "login" ? "Acesse sua conta para continuar" : "Crie sua conta gratuitamente"}
            </Text>
          </View>
        </View>

        {/* Form */}
        <View className="px-8 pb-8 gap-4">
          {/* Error */}
          {error && (
            <View className="bg-error/10 rounded-xl px-4 py-3">
              <Text className="text-error text-sm text-center">{error}</Text>
            </View>
          )}

          {/* Email */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-muted" style={{ letterSpacing: 0.4 }}>
              EMAIL
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 text-foreground"
              style={{ height: 52, fontSize: 15 }}
              placeholder="seu@email.com"
              placeholderTextColor="#9BA1A6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View className="gap-1.5">
            <Text className="text-xs font-semibold text-muted" style={{ letterSpacing: 0.4 }}>
              SENHA
            </Text>
            <TextInput
              className="bg-surface border border-border rounded-xl px-4 text-foreground"
              style={{ height: 52, fontSize: 15 }}
              placeholder={mode === "register" ? "Mínimo 8 caracteres" : "••••••••"}
              placeholderTextColor="#9BA1A6"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              textContentType={mode === "register" ? "newPassword" : "password"}
              editable={!loading}
            />
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => ({ opacity: pressed || loading ? 0.8 : 1, marginTop: 4 })}
          >
            <View
              style={{
                backgroundColor: "#0a7ea4",
                borderRadius: 14,
                height: 54,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", letterSpacing: 0.2 }}>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Text>
              )}
            </View>
          </Pressable>

          {/* Toggle mode */}
          <Pressable onPress={toggleMode} disabled={loading}>
            <Text className="text-muted text-sm text-center" style={{ lineHeight: 20 }}>
              {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
              <Text style={{ color: "#0a7ea4", fontWeight: "600" }}>
                {mode === "login" ? "Criar conta" : "Entrar"}
              </Text>
            </Text>
          </Pressable>

          {/* Forgot password */}
          {mode === "login" && (
            <Pressable onPress={() => router.push("/forgot-password")} disabled={loading}>
              <Text className="text-muted text-sm text-center">
                <Text style={{ color: "#0a7ea4", fontWeight: "500" }}>Esqueceu a senha?</Text>
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
