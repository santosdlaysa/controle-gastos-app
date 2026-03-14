import { useState, useRef } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { setSelectedBank } from '@/lib/selected-bank';
import { trpc } from '@/lib/trpc';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export default function BankSelectScreen() {
  const router = useRouter();
  const colors = useColors();
  const utils = trpc.useUtils();

  const { data: banks = [], isLoading } = trpc.bank.getAll.useQuery();
  const createBank = trpc.bank.create.useMutation({
    onSuccess: () => utils.bank.getAll.invalidate(),
  });
  const deleteBank = trpc.bank.delete.useMutation({
    onSuccess: () => utils.bank.getAll.invalidate(),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function selectBank(bank: { id: number; name: string } | null) {
    if (bank) {
      // Specific bank → go to bank detail screen
      router.replace(`/bank/${bank.id}`);
    } else {
      // All banks → go to home without any filter
      setSelectedBank(null);
      router.replace('/(tabs)');
    }
  }

  async function handleCreate() {
    const name = newBankName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createBank.mutateAsync({ name });
      setNewBankName('');
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível cadastrar o banco.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(item: { id: number; name: string }) {
    Alert.alert(
      'Remover banco',
      `Deseja remover "${item.name}"? As despesas associadas não serão excluídas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => deleteBank.mutate({ id: item.id }),
        },
      ]
    );
  }

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      {/* Decorative circle */}
      <View pointerEvents="none" style={{ position: 'absolute', top: -80, right: -100, opacity: 0.05 }}>
        <Svg width={320} height={320} viewBox="0 0 320 320">
          <Circle cx="160" cy="160" r="160" fill="#0a7ea4" />
        </Svg>
      </View>

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 }}>
            Selecionar Banco
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            Escolha o banco para ver as despesas
          </Text>
        </View>
        <Pressable
          onPress={() => { setNewBankName(''); setModalVisible(true); setTimeout(() => inputRef.current?.focus(), 80); }}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, backgroundColor: colors.tint, borderRadius: 14, padding: 10 }]}
        >
          <MaterialIcons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={banks.filter((b) => b.id != null)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListHeaderComponent={
            <Pressable
              onPress={() => selectBank(null)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                style={{
                  backgroundColor: '#0a7ea4',
                  borderRadius: 18,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  shadowColor: '#0a7ea4',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 12,
                  elevation: 6,
                  marginBottom: 4,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="account-balance-wallet" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
                    Todos os bancos
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    Visualizar todas as despesas
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
              <MaterialIcons name="account-balance" size={48} color={colors.muted} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 14, textAlign: 'center' }}>
                Nenhum banco cadastrado ainda
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' }}>
                Toque no{' '}
                <Text style={{ color: colors.tint, fontWeight: '600' }}>+</Text>
                {' '}para adicionar seu primeiro banco.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => selectBank(item)}
              onLongPress={() => confirmDelete(item)}
              style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
            >
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: colors.tint + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="credit-card" size={22} color={colors.tint} />
                </View>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text }}>
                  {item.name}
                </Text>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  hitSlop={12}
                  style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}
                >
                  <MaterialIcons name="delete-outline" size={20} color={colors.muted} />
                </Pressable>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Create bank modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Novo banco</Text>

            <TextInput
              ref={inputRef}
              value={newBankName}
              onChangeText={setNewBankName}
              placeholder="Nome do banco (ex: Nubank)"
              placeholderTextColor={colors.muted}
              style={{
                borderWidth: 1.5,
                borderColor: colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.surface,
              }}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={saving || !newBankName.trim()}
                style={({ pressed }) => [{ flex: 1, opacity: (pressed || saving || !newBankName.trim()) ? 0.6 : 1, backgroundColor: colors.tint, borderRadius: 12, padding: 14, alignItems: 'center' }]}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar</Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
