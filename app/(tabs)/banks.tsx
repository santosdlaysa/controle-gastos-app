import { useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, ActivityIndicator,
  Alert, Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { trpc } from '@/lib/trpc';
import { Toast, useToast } from '@/components/toast';

export default function BanksScreen() {
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
  const { toast, show: showToast } = useToast();

  async function handleCreate() {
    const name = newBankName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createBank.mutateAsync({ name });
      setNewBankName('');
      setModalVisible(false);
      showToast('Conta cadastrada!');
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
          onPress: () => { deleteBank.mutate({ id: item.id }); showToast('Conta removida', 'info'); },
        },
      ]
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>Bancos</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            Selecione um banco para ver suas transações
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
      ) : banks.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <MaterialIcons name="account-balance" size={56} color={colors.muted} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' }}>
            Nenhum banco cadastrado
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 8, textAlign: 'center' }}>
            Toque no{' '}
            <Text style={{ color: colors.tint, fontWeight: '600' }}>+</Text>
            {' '}para adicionar um banco ou adicione uma despesa com banco associado.
          </Text>
        </View>
      ) : (
        <FlatList
          data={banks.filter((b) => b.id != null)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/bank/${item.id}`)}
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
      <Toast {...toast} />
    </ScreenContainer>
  );
}
