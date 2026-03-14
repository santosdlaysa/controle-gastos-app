import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type Step = "email" | "code";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestCode = async () => {
    setError(null);
    if (!email.trim()) { setError("Digite seu email."); return; }
    setLoading(true);
    try {
      await Api.forgotPassword(email.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar código.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    if (!code.trim()) { setError("Digite o código recebido."); return; }
    if (newPassword.length < 8) { setError("Senha deve ter no mínimo 8 caracteres."); return; }
    if (newPassword !== confirmPassword) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    try {
      await Api.resetPassword(email.trim(), code.trim(), newPassword);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, paddingHorizontal: 28, justifyContent: "center", gap: 32 }}>

          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={{ alignSelf: "flex-start" }}>
            <MaterialIcons name="arrow-back" size={24} color="#0a7ea4" />
          </TouchableOpacity>

          {/* Header */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 28, fontWeight: "700", color: "#0a7ea4", letterSpacing: -0.5 }}>
              {step === "email" ? "Esqueceu a senha?" : "Digite o código"}
            </Text>
            <Text style={{ fontSize: 14, color: "#9BA1A6", lineHeight: 20 }}>
              {step === "email"
                ? "Informe seu email e enviaremos um código de 6 dígitos."
                : `Código enviado para ${email}. Digite abaixo com sua nova senha.`}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={{ backgroundColor: "#FEE2E2", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#DC2626", fontSize: 13, textAlign: "center" }}>{error}</Text>
            </View>
          )}

          {step === "email" ? (
            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.6 }}>
                  EMAIL
                </Text>
                <TextInput
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 16,
                    fontSize: 15,
                    color: "#1A1A1A",
                    backgroundColor: "#F9FAFB",
                  }}
                  placeholder="seu@email.com"
                  placeholderTextColor="#9BA1A6"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <Pressable
                onPress={handleRequestCode}
                disabled={loading}
                style={({ pressed }) => ({ opacity: pressed || loading ? 0.8 : 1 })}
              >
                <View style={{ backgroundColor: "#0a7ea4", borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center" }}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Enviar código</Text>
                  }
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {/* Code */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.6 }}>
                  CÓDIGO DE 6 DÍGITOS
                </Text>
                <TextInput
                  style={{
                    height: 60,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 16,
                    fontSize: 28,
                    fontWeight: "700",
                    letterSpacing: 12,
                    color: "#0a7ea4",
                    backgroundColor: "#F0F9FF",
                    textAlign: "center",
                  }}
                  placeholder="000000"
                  placeholderTextColor="#C7D2FE"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              {/* New password */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.6 }}>
                  NOVA SENHA
                </Text>
                <TextInput
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 16,
                    fontSize: 15,
                    color: "#1A1A1A",
                    backgroundColor: "#F9FAFB",
                  }}
                  placeholder="Mínimo 8 caracteres"
                  placeholderTextColor="#9BA1A6"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              {/* Confirm password */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#9BA1A6", letterSpacing: 0.6 }}>
                  CONFIRMAR SENHA
                </Text>
                <TextInput
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    paddingHorizontal: 16,
                    fontSize: 15,
                    color: "#1A1A1A",
                    backgroundColor: "#F9FAFB",
                  }}
                  placeholder="Repita a nova senha"
                  placeholderTextColor="#9BA1A6"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <Pressable
                onPress={handleResetPassword}
                disabled={loading}
                style={({ pressed }) => ({ opacity: pressed || loading ? 0.8 : 1 })}
              >
                <View style={{ backgroundColor: "#0a7ea4", borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center" }}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Redefinir senha</Text>
                  }
                </View>
              </Pressable>

              {/* Reenviar */}
              <Pressable onPress={() => { setStep("email"); setCode(""); setError(null); }} disabled={loading}>
                <Text style={{ color: "#0a7ea4", fontSize: 13, textAlign: "center", fontWeight: "500" }}>
                  Não recebeu? Enviar novamente
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
