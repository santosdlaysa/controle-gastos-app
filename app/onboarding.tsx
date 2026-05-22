import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_DISMISSED_KEY = 'onboarding_checklist_dismissed';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  {
    key: 'welcome',
    icon: 'rocket-launch' as const,
    color: '#0a7ea4',
    title: 'Bem-vindo ao\nControle de Gastos!',
    subtitle: 'Vamos configurar tudo em poucos passos para você começar a controlar suas finanças.',
  },
  {
    key: 'bank',
    icon: 'account-balance' as const,
    color: '#6366F1',
    title: 'Adicione sua\nprimeira conta',
    subtitle: 'Cadastre o banco ou cartão que você mais usa. Você pode adicionar outros depois.',
  },
  {
    key: 'income',
    icon: 'attach-money' as const,
    color: '#10B981',
    title: 'Qual sua renda\nmensal?',
    subtitle: 'Isso ajuda a calcular quanto você pode gastar por mês. Pode pular se preferir.',
  },
  {
    key: 'done',
    icon: 'check-circle' as const,
    color: '#10B981',
    title: 'Tudo pronto!',
    subtitle: 'Agora você pode começar a cadastrar seus gastos e acompanhar suas finanças.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();

  const [currentStep, setCurrentStep] = useState(0);

  // Bank step
  const [bankName, setBankName] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankCreated, setBankCreated] = useState(false);
  const createBank = trpc.bank.create.useMutation({ onSuccess: () => utils.bank.getAll.invalidate() });
  const bankInputRef = useRef<TextInput>(null);

  // Income step
  const [salary, setSalary] = useState('');
  const [vale, setVale] = useState('');
  const [other, setOther] = useState('');
  const [savingIncome, setSavingIncome] = useState(false);
  const [incomeCreated, setIncomeCreated] = useState(false);
  const updateIncome = trpc.income.update.useMutation({ onSuccess: () => utils.income.get.invalidate() });

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  async function handleCreateBank() {
    const name = bankName.trim();
    if (!name) {
      Alert.alert('Atenção', 'Digite o nome do banco ou cartão.');
      return;
    }
    setSavingBank(true);
    try {
      await createBank.mutateAsync({ name, isCredit });
      setBankCreated(true);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível cadastrar.');
    } finally {
      setSavingBank(false);
    }
  }

  async function handleSaveIncome() {
    const salaryNum = parseFloat(salary.replace(',', '.')) || 0;
    const valeNum = parseFloat(vale.replace(',', '.')) || 0;
    const otherNum = parseFloat(other.replace(',', '.')) || 0;
    if (salaryNum < 0 || valeNum < 0 || otherNum < 0) {
      Alert.alert('Erro', 'Os valores não podem ser negativos.');
      return;
    }
    setSavingIncome(true);
    try {
      await updateIncome.mutateAsync({ salary: salaryNum, vale: valeNum, other: otherNum });
      setIncomeCreated(true);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a renda.');
    } finally {
      setSavingIncome(false);
    }
  }

  async function handleNext() {
    if (isLastStep) {
      await AsyncStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
      router.replace('/(tabs)');
      return;
    }
    setCurrentStep((s) => s + 1);
  }

  async function handleSkip() {
    await AsyncStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
    router.replace('/(tabs)');
  }

  function canAdvance() {
    if (step.key === 'bank') return bankCreated;
    return true;
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Decorative circles */}
        <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -100, opacity: 0.06 }}>
          <Svg width={360} height={360} viewBox="0 0 360 360">
            <Circle cx="180" cy="180" r="180" fill={step.color} />
          </Svg>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 40, left: -120, opacity: 0.04 }}>
          <Svg width={300} height={300} viewBox="0 0 300 300">
            <Circle cx="150" cy="150" r="150" fill={step.color} />
          </Svg>
        </View>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === currentStep ? step.color : colors.border,
                }}
              />
            ))}
          </View>

          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                backgroundColor: step.color + '15',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name={step.icon} size={40} color={step.color} />
            </View>
          </View>

          {/* Title & subtitle */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: colors.text,
              textAlign: 'center',
              letterSpacing: -0.5,
              lineHeight: 36,
              marginBottom: 12,
            }}
          >
            {step.title}
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: colors.muted,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 32,
              paddingHorizontal: 8,
            }}
          >
            {step.subtitle}
          </Text>

          {/* ── Step: Bank ── */}
          {step.key === 'bank' && (
            <View style={{ gap: 16 }}>
              {!bankCreated ? (
                <>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>
                      Nome do banco ou cartão
                    </Text>
                    <TextInput
                      ref={bankInputRef}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder="Ex: Nubank, Bradesco, Inter..."
                      placeholderTextColor={colors.muted}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleCreateBank}
                      style={{
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        fontSize: 16,
                        color: colors.text,
                        backgroundColor: colors.surface,
                      }}
                    />
                  </View>

                  {/* Credit toggle */}
                  <Pressable
                    onPress={() => setIsCredit(!isCredit)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: isCredit ? '#6366F1' : colors.border,
                        backgroundColor: isCredit ? '#6366F1' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isCredit && <MaterialIcons name="check" size={16} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 14, color: colors.text }}>É um cartão de crédito</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCreateBank}
                    disabled={savingBank || !bankName.trim()}
                    style={({ pressed }) => [{
                      opacity: (pressed || savingBank || !bankName.trim()) ? 0.6 : 1,
                      backgroundColor: '#6366F1',
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }]}
                  >
                    {savingBank ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="add" size={20} color="#fff" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Cadastrar</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#10B981',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="check" size={32} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                    {bankName} cadastrado!
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Você pode adicionar mais contas depois.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step: Income ── */}
          {step.key === 'income' && (
            <View style={{ gap: 14 }}>
              {!incomeCreated ? (
                <>
                  <IncomeInput
                    icon="payments"
                    iconColor="#22C55E"
                    label="Salário"
                    value={salary}
                    onChangeText={setSalary}
                    colors={colors}
                  />
                  <IncomeInput
                    icon="account-balance-wallet"
                    iconColor="#0a7ea4"
                    label="Vale"
                    value={vale}
                    onChangeText={setVale}
                    colors={colors}
                  />
                  <IncomeInput
                    icon="add-circle-outline"
                    iconColor="#F59E0B"
                    label="Outros"
                    value={other}
                    onChangeText={setOther}
                    colors={colors}
                  />

                  <Pressable
                    onPress={handleSaveIncome}
                    disabled={savingIncome}
                    style={({ pressed }) => [{
                      opacity: (pressed || savingIncome) ? 0.6 : 1,
                      backgroundColor: '#10B981',
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 4,
                    }]}
                  >
                    {savingIncome ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <MaterialIcons name="save" size={20} color="#fff" />
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar renda</Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: '#10B981',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="check" size={32} color="#fff" />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>
                    Renda configurada!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step: Done ── */}
          {step.key === 'done' && (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  { icon: 'receipt-long' as const, label: 'Cadastrar gastos', color: '#EF4444' },
                  { icon: 'pie-chart' as const, label: 'Ver categorias', color: '#F59E0B' },
                  { icon: 'bar-chart' as const, label: 'Acompanhar histórico', color: '#6366F1' },
                ].map((item) => (
                  <View
                    key={item.label}
                    style={{
                      backgroundColor: item.color + '10',
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <MaterialIcons name={item.icon} size={16} color={item.color} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: item.color }}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ flex: 1 }} />

          {/* Navigation buttons */}
          <View style={{ gap: 12, marginTop: 24 }}>
            <Pressable
              onPress={handleNext}
              disabled={!canAdvance()}
              style={({ pressed }) => [{
                opacity: (pressed || !canAdvance()) ? 0.6 : 1,
                backgroundColor: step.color,
                borderRadius: 16,
                padding: 18,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }]}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                {isLastStep ? 'Começar a usar' : step.key === 'welcome' ? 'Vamos lá!' : 'Próximo'}
              </Text>
              <MaterialIcons name={isLastStep ? 'check' : 'arrow-forward'} size={20} color="#fff" />
            </Pressable>

            {!isLastStep && currentStep > 0 && (
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => [{
                  opacity: pressed ? 0.6 : 1,
                  padding: 14,
                  alignItems: 'center',
                }]}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.muted }}>
                  Pular e configurar depois
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function IncomeInput({
  icon,
  iconColor,
  label,
  value,
  onChangeText,
  colors,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor: colors.surface,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: iconColor + '15',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="R$ 0,00"
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          style={{ fontSize: 16, fontWeight: '700', color: colors.text, paddingVertical: 4 }}
        />
      </View>
    </View>
  );
}
