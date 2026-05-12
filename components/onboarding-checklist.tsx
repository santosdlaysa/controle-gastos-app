import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';

const ONBOARDING_DISMISSED_KEY = 'onboarding_checklist_dismissed';

type StepStatus = 'pending' | 'done';

interface Step {
  key: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  color: string;
  status: StepStatus;
  onPress: () => void;
}

export function useOnboardingDismissed() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const { data: banks } = trpc.bank.getAll.useQuery();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_DISMISSED_KEY).then((val) => {
      if (val === 'true') {
        setDismissed(true);
      } else if (val === null && banks !== undefined) {
        // Nunca configurado: só mostrar onboarding se o usuário não tem bancos (é novo)
        // Se já tem bancos, é um usuário antigo — auto-dismiss
        if (banks.length > 0) {
          AsyncStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
          setDismissed(true);
        } else {
          setDismissed(false);
        }
      } else if (val === 'false') {
        setDismissed(false);
      }
    });
  }, [banks]);

  const dismiss = async () => {
    await AsyncStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const reset = async () => {
    await AsyncStorage.removeItem(ONBOARDING_DISMISSED_KEY);
    setDismissed(false);
  };

  return { dismissed, dismiss, reset };
}

export function OnboardingChecklist({
  onDismiss,
  onAddExpense,
}: {
  onDismiss: () => void;
  onAddExpense: () => void;
}) {
  const router = useRouter();
  const colors = useColors();

  const { data: banks = [] } = trpc.bank.getAll.useQuery();
  const { data: categories = [] } = trpc.category.getAll.useQuery();
  const { data: incomeData } = trpc.income.get.useQuery();

  const hasBanks = banks.length > 0;
  const hasCategories = categories.length > 0;
  const hasIncome = incomeData != null && (
    parseFloat(String(incomeData.salary ?? 0)) > 0 ||
    parseFloat(String(incomeData.vale ?? 0)) > 0 ||
    parseFloat(String(incomeData.other ?? 0)) > 0
  );

  const steps: Step[] = [
    {
      key: 'bank',
      icon: 'account-balance',
      title: 'Adicionar conta ou cartão',
      description: 'Cadastre seu banco ou cartão de crédito',
      color: '#6366F1',
      status: hasBanks ? 'done' : 'pending',
      onPress: () => router.navigate('/(tabs)/banks'),
    },
    {
      key: 'category',
      icon: 'category',
      title: 'Revisar categorias',
      description: 'Personalize suas categorias de gastos',
      color: '#F59E0B',
      status: hasCategories ? 'done' : 'pending',
      onPress: () => router.navigate('/(tabs)/categories'),
    },
    {
      key: 'income',
      icon: 'attach-money',
      title: 'Configurar sua renda',
      description: 'Informe seu salário para controle de orçamento',
      color: '#10B981',
      status: hasIncome ? 'done' : 'pending',
      onPress: () => router.navigate('/(tabs)/settings'),
    },
    {
      key: 'expense',
      icon: 'receipt-long',
      title: 'Cadastrar primeiro gasto',
      description: 'Registre sua primeira despesa',
      color: '#EF4444',
      status: 'pending',
      onPress: onAddExpense,
    },
  ];

  const completedCount = steps.filter((s) => s.status === 'done').length;
  const progress = completedCount / steps.length;

  // Find first pending step
  const currentStepIndex = steps.findIndex((s) => s.status === 'pending');

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0a7ea4',
          padding: 20,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="rocket-launch" size={20} color="#fff" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                Primeiros passos
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                {completedCount}/{steps.length} concluídos
              </Text>
            </View>
          </View>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.6 : 1,
                padding: 6,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
              },
            ]}
          >
            <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        {/* Progress bar */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: '#fff',
              width: `${progress * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Steps */}
      <View style={{ padding: 12, gap: 4 }}>
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isDone = step.status === 'done';
          const isLocked = !isDone && index > currentStepIndex;

          return (
            <Pressable
              key={step.key}
              onPress={isLocked ? undefined : step.onPress}
              disabled={isLocked}
              style={({ pressed }) => [
                {
                  opacity: isLocked ? 0.45 : pressed ? 0.7 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: isCurrent ? step.color + '10' : 'transparent',
                  borderWidth: isCurrent ? 1.5 : 0,
                  borderColor: isCurrent ? step.color + '30' : 'transparent',
                },
              ]}
            >
              {/* Step indicator */}
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: isDone ? '#10B981' : step.color + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isDone ? (
                  <MaterialIcons name="check" size={20} color="#fff" />
                ) : isLocked ? (
                  <MaterialIcons name="lock" size={18} color={colors.muted} />
                ) : (
                  <MaterialIcons name={step.icon} size={20} color={step.color} />
                )}
              </View>

              {/* Text */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isDone ? colors.muted : colors.foreground,
                    textDecorationLine: isDone ? 'line-through' : 'none',
                  }}
                >
                  {step.title}
                </Text>
                {isCurrent && (
                  <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                    {step.description}
                  </Text>
                )}
              </View>

              {/* Arrow for current step */}
              {isCurrent && !isDone && (
                <View
                  style={{
                    backgroundColor: step.color,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Ir</Text>
                </View>
              )}
              {isDone && (
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
