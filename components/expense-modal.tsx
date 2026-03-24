import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Expense, ExpenseCategory } from '@/types/expense';
import { trpc } from '@/lib/trpc';

interface ExpenseModalProps {
  visible: boolean;
  expense?: Expense;
  defaultBank?: string;
  defaultPaymentType?: 'debit' | 'credit';
  hideBankField?: boolean;
  hidePaymentTypeField?: boolean;
  onClose: () => void;
  onSave: (data: Omit<Expense, 'id' | 'date' | 'month'>) => void;
  onDelete?: (id: string) => void;
  onMoveToNextMonth?: (id: string) => void;
  onGenerateRemainingInstallments?: (id: string) => void;
}

export function ExpenseModal({
  visible,
  expense,
  defaultBank,
  defaultPaymentType,
  hideBankField,
  hidePaymentTypeField,
  onClose,
  onSave,
  onDelete,
  onMoveToNextMonth,
  onGenerateRemainingInstallments,
}: ExpenseModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [value, setValue] = useState('');
  const [bank, setBank] = useState('');
  const [paymentType, setPaymentType] = useState<'debit' | 'credit' | null>(null);
  const [expenseType, setExpenseType] = useState<'fixed' | 'variable' | null>(null);

  const { data: bankSuggestions = [] } = trpc.bank.getAll.useQuery();
  const { data: categoryList = [] } = trpc.category.getAll.useQuery();

  useEffect(() => {
    if (expense) {
      setName(expense.name);
      setCategory(expense.category);
      setQuantity(expense.quantity || '');
      setValue(expense.value.toString());
      setBank(expense.bank || '');
      setPaymentType(expense.paymentType ?? null);
      setExpenseType(expense.expenseType ?? null);
    } else {
      setName('');
      setCategory(categoryList[0]?.name ?? 'outro');
      setQuantity('');
      setValue('');
      setBank(defaultBank ?? '');
      setPaymentType(defaultPaymentType ?? null);
      setExpenseType(null);
    }
  }, [expense, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome da despesa é obrigatório');
      return;
    }

    const numValue = parseFloat(value.replace(',', '.'));
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Erro', 'Valor deve ser um número positivo');
      return;
    }

    onSave({
      name: name.trim(),
      category,
      quantity: quantity.trim() || undefined,
      value: numValue,
      bank: bank.trim() || null,
      paymentType: paymentType ?? null,
      expenseType: expenseType ?? null,
    });

    onClose();
  };

  const handleDelete = () => {
    if (!expense) return;

    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja deletar "${expense.name}"?`,
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Deletar',
          onPress: () => {
            onDelete?.(expense.id);
            onClose();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleMoveToNextMonth = () => {
    if (!expense || !onMoveToNextMonth) return;

    Alert.alert(
      'Mover para próximo mês',
      'Deseja mover esta despesa (próxima parcela) para o próximo mês?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Mover',
          onPress: () => {
            onMoveToNextMonth(expense.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleGenerateInstallments = () => {
    if (!expense || !onGenerateRemainingInstallments || !expense.quantity) return;

    Alert.alert(
      'Gerar próximas parcelas',
      'Deseja gerar automaticamente todas as próximas parcelas deste lançamento nos próximos meses?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Gerar',
          onPress: () => {
            onGenerateRemainingInstallments(expense.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ width: '100%' }}
      >
        <View className="bg-background rounded-t-3xl p-6 pb-8" style={{ maxHeight: Dimensions.get('window').height * 0.85 }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-foreground">
                {expense ? 'Editar Despesa' : 'Adicionar Despesa'}
              </Text>
              <Pressable onPress={onClose}>
                <Text className="text-2xl text-muted">✕</Text>
              </Pressable>
            </View>

            {/* Name field */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Nome da Despesa
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder="Ex: Transporte"
                placeholderTextColor="#9BA1A6"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Category field */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Categoria
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {categoryList.map((cat) => (
                  <Pressable
                    key={cat.name}
                    onPress={() => setCategory(cat.name)}
                    style={({ pressed }) => [
                      {
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 2,
                        backgroundColor: category === cat.name ? cat.color : 'transparent',
                        borderColor: cat.color,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: category === cat.name ? '#fff' : cat.color,
                        }}
                      >
                        {cat.label}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Quantity field */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Quantidade/Parcelas (opcional)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder="Ex: 5/10"
                placeholderTextColor="#9BA1A6"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>

            {/* Bank field */}
            {!hideBankField && <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Banco/Cartão (opcional)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder="Ex: Nubank, Bradesco"
                placeholderTextColor="#9BA1A6"
                value={bank}
                onChangeText={setBank}
              />
              {bankSuggestions.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {bankSuggestions.map((suggestion) => (
                    <Pressable
                      key={suggestion.id}
                      onPress={() => setBank(suggestion.name)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <View
                        className={cn(
                          'px-3 py-1 rounded-full border',
                          bank === suggestion.name
                            ? 'bg-primary border-primary'
                            : 'bg-surface border-border'
                        )}
                      >
                        <Text
                          className={cn(
                            'text-xs font-medium',
                            bank === suggestion.name ? 'text-background' : 'text-foreground'
                          )}
                        >
                          {suggestion.name}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>}

            {/* Payment type field */}
            {!hidePaymentTypeField && <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Tipo de Pagamento (opcional)
              </Text>
              <View className="flex-row gap-2">
                {(['debit', 'credit'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setPaymentType(paymentType === type ? null : type)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
                  >
                    <View
                      className={cn(
                        'py-3 rounded-lg border-2 items-center',
                        paymentType === type
                          ? 'bg-primary border-primary'
                          : 'bg-surface border-border'
                      )}
                    >
                      <Text className={cn(
                        'text-sm font-semibold',
                        paymentType === type ? 'text-background' : 'text-foreground'
                      )}>
                        {type === 'debit' ? 'Débito' : 'Crédito'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>}

            {/* Expense type field */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Natureza
              </Text>
              <View className="flex-row gap-2">
                {(['fixed', 'variable'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setExpenseType(expenseType === type ? null : type)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, flex: 1 }]}
                  >
                    <View
                      className={cn(
                        'py-3 rounded-lg border-2 items-center',
                        expenseType === type
                          ? 'bg-primary border-primary'
                          : 'bg-surface border-border'
                      )}
                    >
                      <Text className={cn(
                        'text-sm font-semibold',
                        expenseType === type ? 'text-background' : 'text-foreground'
                      )}>
                        {type === 'fixed' ? 'Fixo' : 'Variável'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Value field */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-2">
                Valor (R$)
              </Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder="0.00"
                placeholderTextColor="#9BA1A6"
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Buttons */}
            <View className="gap-3">
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-primary rounded-lg p-4 items-center">
                  <Text className="text-background font-semibold text-base">
                    {expense ? 'Atualizar' : 'Adicionar'}
                  </Text>
                </View>
              </Pressable>

              {expense && expense.quantity && (
                <>
                  {onMoveToNextMonth && (
                    <Pressable
                      onPress={handleMoveToNextMonth}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View className="bg-success rounded-lg p-4 items-center">
                        <Text className="text-background font-semibold text-base">
                          Mandar próxima parcela para próximo mês
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {onGenerateRemainingInstallments && (
                    <Pressable
                      onPress={handleGenerateInstallments}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View className="bg-primary rounded-lg p-4 items-center">
                        <Text className="text-background font-semibold text-base">
                          Gerar todas as próximas parcelas
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </>
              )}

              {expense && (
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <View className="bg-error rounded-lg p-4 items-center">
                    <Text className="text-background font-semibold text-base">
                      Deletar
                    </Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View className="bg-surface border border-border rounded-lg p-4 items-center">
                  <Text className="text-foreground font-semibold text-base">
                    Cancelar
                  </Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
