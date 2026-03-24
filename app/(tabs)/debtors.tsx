import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { Toast, useToast } from '@/components/toast';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type ModalMode =
  | { type: 'create' }
  | { type: 'edit_name'; id: number; currentName: string }
  | { type: 'add'; id: number; name: string }
  | { type: 'subtract'; id: number; name: string };

export default function DebtorsScreen() {
  const colors = useColors();
  const utils = trpc.useUtils();
  const { toast, show: showToast } = useToast();

  const { data: debtors = [], isLoading } = trpc.debtor.getAll.useQuery();
  const createMutation = trpc.debtor.create.useMutation({
    onSuccess: () => utils.debtor.getAll.invalidate(),
  });
  const updateMutation = trpc.debtor.update.useMutation({
    onSuccess: () => utils.debtor.getAll.invalidate(),
  });
  const deleteMutation = trpc.debtor.delete.useMutation({
    onSuccess: () => utils.debtor.getAll.invalidate(),
  });

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [saving, setSaving] = useState(false);

  const totalOwed = debtors.reduce((sum, d) => sum + parseFloat(String(d.totalOwed)), 0);

  function openCreate() {
    setNameInput('');
    setAmountInput('');
    setModalMode({ type: 'create' });
  }

  function openEditName(id: number, currentName: string) {
    setNameInput(currentName);
    setAmountInput('');
    setModalMode({ type: 'edit_name', id, currentName });
  }

  function openAdd(id: number, name: string) {
    setAmountInput('');
    setModalMode({ type: 'add', id, name });
  }

  function openSubtract(id: number, name: string) {
    setAmountInput('');
    setModalMode({ type: 'subtract', id, name });
  }

  function closeModal() {
    setModalMode(null);
    setNameInput('');
    setAmountInput('');
  }

  async function handleSave() {
    if (!modalMode) return;
    setSaving(true);
    try {
      if (modalMode.type === 'create') {
        const trimName = nameInput.trim();
        if (!trimName) { Alert.alert('Nome obrigatório'); return; }
        const amount = parseFloat(amountInput.replace(',', '.')) || 0;
        await createMutation.mutateAsync({ name: trimName, totalOwed: amount });
        showToast('Devedor cadastrado!');
        closeModal();
      } else if (modalMode.type === 'edit_name') {
        const trimName = nameInput.trim();
        if (!trimName) { Alert.alert('Nome obrigatório'); return; }
        await updateMutation.mutateAsync({ id: modalMode.id, name: trimName, mode: 'rename' });
        showToast('Nome atualizado!');
        closeModal();
      } else if (modalMode.type === 'add') {
        const amount = parseFloat(amountInput.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) { Alert.alert('Valor inválido'); return; }
        await updateMutation.mutateAsync({ id: modalMode.id, amount, mode: 'add' });
        showToast('Dívida adicionada!');
        closeModal();
      } else if (modalMode.type === 'subtract') {
        const amount = parseFloat(amountInput.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) { Alert.alert('Valor inválido'); return; }
        await updateMutation.mutateAsync({ id: modalMode.id, amount, mode: 'subtract' });
        showToast('Pagamento registrado!');
        closeModal();
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: number, name: string) {
    Alert.alert('Excluir devedor', `Remover "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          await deleteMutation.mutateAsync({ id });
          showToast('Devedor removido', 'info');
        },
      },
    ]);
  }

  const modalTitle =
    modalMode?.type === 'create' ? 'Novo devedor' :
    modalMode?.type === 'edit_name' ? 'Editar nome' :
    modalMode?.type === 'add' ? `Adicionar dívida — ${modalMode.name}` :
    modalMode?.type === 'subtract' ? `Registrar pagamento — ${modalMode.name}` :
    '';

  const showNameInput = modalMode?.type === 'create' || modalMode?.type === 'edit_name';
  const showAmountInput = modalMode?.type !== 'edit_name';

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>Devedores</Text>
        {debtors.length > 0 && (
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            Total a receber:{' '}
            <Text style={{ fontWeight: '700', color: '#EF4444' }}>R$ {fmt(totalOwed)}</Text>
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginTop: 60 }} />
        ) : debtors.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 16 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
              <MaterialIcons name="person-outline" size={36} color="#EF4444" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>Nenhum devedor cadastrado</Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>
              Cadastre pessoas que devem dinheiro para você.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginTop: 4 }}>
            {debtors.map((d) => {
              const owed = parseFloat(String(d.totalOwed));
              return (
                <View key={d.id} style={{ backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                  <View style={{ height: 3, backgroundColor: owed > 0 ? '#EF4444' : '#10B981' }} />
                  <View style={{ padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#EF444415', alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="person" size={22} color="#EF4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>{d.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                          {owed > 0 ? 'Deve' : 'Zerado'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: owed > 0 ? '#EF4444' : '#10B981' }}>
                        R$ {fmt(owed)}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={() => openAdd(d.id, d.name)}
                        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: '#EF444415', borderRadius: 10, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }]}
                      >
                        <MaterialIcons name="add" size={16} color="#EF4444" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#EF4444' }}>Adicionar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openSubtract(d.id, d.name)}
                        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: '#10B98115', borderRadius: 10, paddingVertical: 9, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }]}
                      >
                        <MaterialIcons name="remove" size={16} color="#10B981" />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>Pagamento</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openEditName(d.id, d.name)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}
                      >
                        <MaterialIcons name="edit" size={16} color={colors.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDelete(d.id, d.name)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}
                      >
                        <MaterialIcons name="delete-outline" size={16} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [{
          position: 'absolute', bottom: 32, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#EF4444',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
          opacity: pressed ? 0.85 : 1,
        }]}
      >
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Modal */}
      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }} onPress={closeModal}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.background, borderRadius: 20, padding: 24, gap: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>{modalTitle}</Text>

              {showNameInput && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>Nome</Text>
                  <View style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.surface }}>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      placeholder="Ex: João"
                      placeholderTextColor={colors.muted}
                      style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, paddingVertical: 12 }}
                      autoFocus={showNameInput && !showAmountInput}
                    />
                  </View>
                </View>
              )}

              {showAmountInput && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 }}>
                    {modalMode?.type === 'create' ? 'Valor inicial (opcional)' :
                     modalMode?.type === 'add' ? 'Valor a adicionar' :
                     'Valor pago'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.surface }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.muted }}>R$</Text>
                    <TextInput
                      value={amountInput}
                      onChangeText={setAmountInput}
                      keyboardType="decimal-pad"
                      placeholder="0,00"
                      placeholderTextColor={colors.muted}
                      style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.foreground, paddingVertical: 12 }}
                      autoFocus={showAmountInput && !showNameInput}
                    />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={closeModal} style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1, backgroundColor: colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.muted }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={({ pressed }) => [{ flex: 1, opacity: pressed || saving ? 0.7 : 1, backgroundColor: '#EF4444', borderRadius: 12, padding: 14, alignItems: 'center' }]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Salvar</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Toast {...toast} />
    </ScreenContainer>
  );
}
