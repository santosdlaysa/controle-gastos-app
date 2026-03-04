import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import {
  UberEntry,
  UberEntryType,
  UberEarningCategory,
  UberExpenseCategory,
  UBER_EARNING_CATEGORIES,
  UBER_EXPENSE_CATEGORIES,
  UBER_EARNING_CATEGORY_LABELS,
  UBER_EXPENSE_CATEGORY_LABELS,
} from '@/types/uber-earnings';

interface UberEarningModalProps {
  visible: boolean;
  earning?: UberEntry;
  defaultEntryType?: UberEntryType;
  onClose: () => void;
  onSave: (data: Omit<UberEntry, 'id' | 'date' | 'month'>) => void;
  onDelete?: (id: string) => void;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function UberEarningModal({
  visible,
  earning,
  defaultEntryType = 'ganho',
  onClose,
  onSave,
  onDelete,
}: UberEarningModalProps) {
  const [entryType, setEntryType] = useState<UberEntryType>(defaultEntryType);
  const [description, setDescription] = useState('');
  const [earningCategory, setEarningCategory] = useState<UberEarningCategory>('corrida');
  const [expenseCategory, setExpenseCategory] = useState<UberExpenseCategory>('combustivel');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (earning) {
      setEntryType(earning.entryType);
      setDescription(earning.description);
      if (earning.entryType === 'ganho') {
        setEarningCategory(earning.category as UberEarningCategory);
      } else {
        setExpenseCategory(earning.category as UberExpenseCategory);
      }
      setValue(earning.value.toString());
    } else {
      setEntryType(defaultEntryType);
      setDescription('');
      setEarningCategory('corrida');
      setExpenseCategory('combustivel');
      setValue('');
    }
  }, [earning, visible, defaultEntryType]);

  const activeCategory = entryType === 'ganho' ? earningCategory : expenseCategory;

  const handleSave = () => {
    if (!description.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      Alert.alert('Erro', 'Valor deve ser um número positivo');
      return;
    }
    onSave({
      description: description.trim(),
      category: activeCategory,
      entryType,
      value: numValue,
    });
    onClose();
  };

  const handleDelete = () => {
    if (!earning) return;
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja deletar "${earning.description}"?`,
      [
        { text: 'Cancelar' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: () => {
            onDelete?.(earning.id);
            onClose();
          },
        },
      ]
    );
  };

  const isEditing = !!earning;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-background rounded-t-3xl p-6 pb-8">
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-foreground">
                {isEditing ? 'Editar Registro' : 'Novo Registro'}
              </Text>
              <Pressable onPress={onClose}>
                <Text className="text-2xl text-muted">✕</Text>
              </Pressable>
            </View>

            {/* Toggle Ganho / Gasto */}
            {!isEditing && (
              <View className="mb-5 flex-row bg-surface rounded-xl p-1 border border-border">
                <Pressable
                  onPress={() => setEntryType('ganho')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
                >
                  <View
                    className={cn(
                      'flex-row items-center justify-center gap-2 py-2.5 rounded-lg',
                      entryType === 'ganho' ? 'bg-success' : ''
                    )}
                  >
                    <Text
                      className={cn(
                        'font-semibold text-sm',
                        entryType === 'ganho' ? 'text-white' : 'text-muted'
                      )}
                    >
                      💰 Ganho
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => setEntryType('gasto')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
                >
                  <View
                    className={cn(
                      'flex-row items-center justify-center gap-2 py-2.5 rounded-lg',
                      entryType === 'gasto' ? 'bg-error' : ''
                    )}
                  >
                    <Text
                      className={cn(
                        'font-semibold text-sm',
                        entryType === 'gasto' ? 'text-white' : 'text-muted'
                      )}
                    >
                      💸 Gasto
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}

            {/* Descrição */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Descrição</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder={
                  entryType === 'ganho'
                    ? 'Ex: Corridas da manhã'
                    : 'Ex: Abastecimento posto Shell'
                }
                placeholderTextColor="#9BA1A6"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Categoria */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-foreground mb-2">Categoria</Text>
              <View className="flex-row flex-wrap gap-2">
                {entryType === 'ganho'
                  ? UBER_EARNING_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setEarningCategory(cat)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View
                          className={cn(
                            'px-4 py-2 rounded-full border-2',
                            earningCategory === cat
                              ? 'bg-success border-success'
                              : 'bg-surface border-border'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-sm font-medium',
                              earningCategory === cat ? 'text-white' : 'text-foreground'
                            )}
                          >
                            {UBER_EARNING_CATEGORY_LABELS[cat]}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  : UBER_EXPENSE_CATEGORIES.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => setExpenseCategory(cat)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View
                          className={cn(
                            'px-4 py-2 rounded-full border-2',
                            expenseCategory === cat
                              ? 'bg-error border-error'
                              : 'bg-surface border-border'
                          )}
                        >
                          <Text
                            className={cn(
                              'text-sm font-medium',
                              expenseCategory === cat ? 'text-white' : 'text-foreground'
                            )}
                          >
                            {UBER_EXPENSE_CATEGORY_LABELS[cat]}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
              </View>
            </View>

            {/* Valor */}
            <View className="mb-6">
              <Text className="text-sm font-semibold text-foreground mb-2">Valor (R$)</Text>
              <TextInput
                className="bg-surface border border-border rounded-lg p-3 text-foreground"
                placeholder="0.00"
                placeholderTextColor="#9BA1A6"
                value={value}
                onChangeText={setValue}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Botões */}
            <View className="gap-3">
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <View
                  className={cn(
                    'rounded-lg p-4 items-center',
                    entryType === 'ganho' ? 'bg-success' : 'bg-error'
                  )}
                >
                  <Text className="text-white font-semibold text-base">
                    {isEditing ? 'Atualizar' : entryType === 'ganho' ? 'Adicionar Ganho' : 'Adicionar Gasto'}
                  </Text>
                </View>
              </Pressable>

              {isEditing && (
                <Pressable
                  onPress={handleDelete}
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                >
                  <View className="bg-error/20 border border-error rounded-lg p-4 items-center">
                    <Text className="text-error font-semibold text-base">Deletar</Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <View className="bg-surface border border-border rounded-lg p-4 items-center">
                  <Text className="text-foreground font-semibold text-base">Cancelar</Text>
                </View>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
