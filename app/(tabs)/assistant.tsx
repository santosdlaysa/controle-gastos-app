import React, { useState, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
};

const SUGGESTIONS = [
  "Como estão meus gastos este mês?",
  "Onde estou gastando mais?",
  "Tenho margem para economizar?",
  "Analise meu orçamento",
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const month = getCurrentMonth();

  const chatMutation = trpc.assistant.chat.useMutation();

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: ChatMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content: trimmed,
      };

      const next = [...messages, userMessage];
      const typingMessage: ChatMessage = {
        id: "typing",
        role: "assistant",
        content: "Aguarde um momento, estamos analisando seus dados...",
        isTyping: true,
      };
      setMessages([...next, typingMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const result = await chatMutation.mutateAsync({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          month,
        });

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== "typing"),
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: result.message || "Não consegui gerar uma resposta. Tente novamente.",
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== "typing"),
          {
            id: `${Date.now()}-error`,
            role: "assistant",
            content: "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, chatMutation, month],
  );

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === "user";
      return (
        <View className={`mb-3 flex-row ${isUser ? "justify-end" : "justify-start"}`}>
          {!isUser && (
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2 mt-1 shrink-0">
              <Text style={{ fontSize: 14 }}>🤖</Text>
            </View>
          )}
          <View
            className="rounded-2xl px-4 py-3"
            style={{
              maxWidth: "80%",
              backgroundColor: isUser ? colors.tint : colors.surface,
              borderTopRightRadius: isUser ? 4 : 16,
              borderTopLeftRadius: isUser ? 16 : 4,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: isUser ? "#ffffff" : colors.muted,
                fontStyle: item.isTyping ? "italic" : "normal",
              }}
            >
              {item.content}
            </Text>
            {item.isTyping && (
              <ActivityIndicator
                size="small"
                color={colors.tint}
                style={{ marginTop: 6, alignSelf: "flex-start" }}
              />
            )}
          </View>
        </View>
      );
    },
    [colors],
  );

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-3 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Assistente</Text>
          <Text className="text-xs text-muted mt-0.5">Consultor financeiro com IA</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 8, flexGrow: 1 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-8 px-4">
              <Text style={{ fontSize: 56, marginBottom: 16 }}>🤖</Text>
              <Text className="text-xl font-bold text-foreground text-center mb-2">
                Olá! Sou seu assistente financeiro.
              </Text>
              <Text className="text-sm text-muted text-center mb-8 leading-5">
                Posso analisar seus gastos, identificar padrões e te ajudar a tomar melhores
                decisões com seu dinheiro.
              </Text>
              <View className="w-full gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => sendMessage(suggestion)}
                    className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-sm text-muted mr-2">💬</Text>
                    <Text className="text-sm text-foreground flex-1">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Input bar */}
        <View
          className="flex-row items-end px-4 py-3 border-t border-border gap-2"
          style={{ backgroundColor: colors.background }}
        >
          <TextInput
            className="flex-1 rounded-2xl px-4 py-3 text-sm"
            style={{
              backgroundColor: colors.surface,
              color: colors.foreground,
              maxHeight: 120,
              minHeight: 44,
            }}
            placeholder="Pergunte sobre suas finanças..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                input.trim() && !isLoading ? colors.tint : colors.surface,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                color: input.trim() && !isLoading ? "#ffffff" : colors.muted,
                fontWeight: "bold",
              }}
            >
              ↑
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
