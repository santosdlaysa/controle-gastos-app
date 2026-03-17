import { useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Bank {
  id: number;
  name: string;
  debitBalance: string | null;
}

interface Props {
  visible: boolean;
  fromBank: Bank;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferModal({ visible, fromBank, onClose, onSuccess }: Props) {
  const colors = useColors();
  const utils = trpc.useUtils();

  const { data: allBanks = [] } = trpc.bank.getAll.useQuery();
  const transfer = trpc.bank.transfer.useMutation();

  const [toId, setToId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const destinations = allBanks.filter(b => b.id !== fromBank.id && b.id != null);
  const fromBalance = fromBank.debitBalance != null ? parseFloat(String(fromBank.debitBalance)) : null;
  const selectedDest = destinations.find(b => b.id === toId);

  async function handleTransfer() {
    if (!toId) { Alert.alert('Erro', 'Selecione a conta de destino'); return; }
    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) { Alert.alert('Erro', 'Digite um valor válido'); return; }
    if (fromBalance !== null && value > fromBalance) {
      Alert.alert('Saldo insuficiente', `Saldo disponível: R$ ${fmt(fromBalance)}`);
      return;
    }
    setSaving(true);
    try {
      await transfer.mutateAsync({ fromId: fromBank.id, toId, amount: value });
      await Promise.all([
        utils.bank.getAll.invalidate(),
        utils.bank.getById.invalidate({ id: fromBank.id }),
        utils.bank.getById.invalidate({ id: toId }),
      ]);
      setAmount('');
      setToId(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível realizar a transferência');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setAmount('');
    setToId(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, maxHeight: '85%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Transferência</Text>
              <Pressable onPress={handleClose}>
                <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
              </Pressable>
            </View>

            {/* From */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>DE</Text>
            <View style={{
              backgroundColor: colors.surface, borderRadius: 12, padding: 14,
              borderWidth: 1.5, borderColor: colors.tint, marginBottom: 16,
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tint + '20', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="account-balance-wallet" size={18} color={colors.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{fromBank.name}</Text>
                {fromBalance !== null && (
                  <Text style={{ fontSize: 12, color: colors.muted }}>Saldo: R$ {fmt(fromBalance)}</Text>
                )}
              </View>
            </View>

            {/* Arrow */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <MaterialIcons name="arrow-downward" size={22} color={colors.muted} />
            </View>

            {/* To */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>PARA</Text>
            {destinations.length === 0 ? (
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: colors.muted, fontSize: 14 }}>Nenhuma outra conta cadastrada</Text>
              </View>
            ) : (
              <View style={{ gap: 8, marginBottom: 20 }}>
                {destinations.map(b => {
                  const bal = b.debitBalance != null ? parseFloat(String(b.debitBalance)) : null;
                  const selected = toId === b.id;
                  return (
                    <Pressable key={b.id} onPress={() => setToId(b.id!)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
                      <View style={{
                        backgroundColor: selected ? colors.tint + '15' : colors.surface,
                        borderRadius: 12, padding: 14,
                        borderWidth: 1.5, borderColor: selected ? colors.tint : colors.border,
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                      }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: (selected ? colors.tint : colors.muted) + '20', alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name="account-balance" size={18} color={selected ? colors.tint : colors.muted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{b.name}</Text>
                          {bal !== null && (
                            <Text style={{ fontSize: 12, color: colors.muted }}>Saldo: R$ {fmt(bal)}</Text>
                          )}
                        </View>
                        {selected && <MaterialIcons name="check-circle" size={20} color={colors.tint} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Amount */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>VALOR</Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
              paddingHorizontal: 14, backgroundColor: colors.surface, marginBottom: 24,
            }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.tint }}>R$</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                style={{ flex: 1, fontSize: 20, fontWeight: '700', color: colors.foreground, paddingVertical: 14 }}
              />
            </View>

            {/* Summary */}
            {toId && amount && (() => {
              const v = parseFloat(amount.replace(',', '.'));
              if (isNaN(v) || v <= 0) return null;
              const destBal = selectedDest?.debitBalance != null ? parseFloat(String(selectedDest.debitBalance)) : null;
              return (
                <View style={{ backgroundColor: colors.tint + '12', borderRadius: 12, padding: 14, marginBottom: 20, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.muted }}>{fromBank.name} após transferência</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
                      R$ {fromBalance !== null ? fmt(fromBalance - v) : '—'}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: colors.muted }}>{selectedDest?.name} após transferência</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#22C55E' }}>
                      R$ {destBal !== null ? fmt(destBal + v) : '—'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Button */}
            <Pressable
              onPress={handleTransfer}
              disabled={saving || !toId || !amount.trim()}
              style={({ pressed }) => [{ opacity: (pressed || saving || !toId || !amount.trim()) ? 0.6 : 1 }]}
            >
              <View style={{ backgroundColor: colors.tint, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  {saving ? 'Transferindo...' : 'Transferir'}
                </Text>
              </View>
            </Pressable>

            <Pressable onPress={handleClose} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 10 }]}>
              <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 15 }}>Cancelar</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
