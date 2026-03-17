import { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useColors } from '@/hooks/use-colors';
import { UserCategory } from '@/types/expense';

const COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308',
  '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#A855F7', '#EC4899', '#F43F5E', '#6B7280',
  '#0c3a5e', '#0a7ea4', '#374151', '#111827',
];

const ICONS: Array<React.ComponentProps<typeof MaterialIcons>['name']> = [
  'home', 'restaurant', 'directions-car', 'local-hospital',
  'school', 'sports-esports', 'category', 'shopping-cart',
  'local-grocery-store', 'fitness-center', 'pets', 'flight',
  'hotel', 'local-gas-station', 'local-pharmacy', 'build',
  'computer', 'phone-android', 'music-note', 'sports-soccer',
  'coffee', 'local-bar', 'movie', 'book',
  'attach-money', 'savings', 'work', 'child-care',
  'elderly', 'park', 'beach-access', 'local-laundry-service',
];

interface Props {
  visible: boolean;
  category: UserCategory | null;
  onClose: () => void;
  onSave: (data: { id: number; label: string; color: string; icon: string }) => void;
}

export function CategoryEditModal({ visible, category, onClose, onSave }: Props) {
  const colors = useColors();
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>('category');

  useEffect(() => {
    if (category) {
      setLabel(category.label);
      setSelectedColor(category.color);
      setSelectedIcon(category.icon);
    }
  }, [category, visible]);

  const handleSave = () => {
    if (!label.trim()) {
      Alert.alert('Erro', 'Nome da categoria é obrigatório');
      return;
    }
    if (!category) return;
    onSave({ id: category.id, label: label.trim(), color: selectedColor, icon: selectedIcon });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.foreground }}>Editar Categoria</Text>
              <Pressable onPress={onClose}>
                <Text style={{ fontSize: 22, color: colors.muted }}>✕</Text>
              </Pressable>
            </View>

            {/* Preview */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 18,
                backgroundColor: selectedColor + '25',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: selectedColor,
              }}>
                <MaterialIcons name={selectedIcon as any} size={30} color={selectedColor} />
              </View>
              <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '600', color: selectedColor }}>{label || '—'}</Text>
            </View>

            {/* Name */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 8 }}>Nome</Text>
            <TextInput
              style={{
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
                borderRadius: 10, padding: 12, color: colors.foreground, marginBottom: 20, fontSize: 15,
              }}
              placeholder="Nome da categoria"
              placeholderTextColor={colors.muted}
              value={label}
              onChangeText={setLabel}
            />

            {/* Color picker */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>Cor</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
              {COLORS.map((c) => (
                <Pressable key={c} onPress={() => setSelectedColor(c)}>
                  <View style={{
                    width: 36, height: 36, borderRadius: 18, backgroundColor: c,
                    borderWidth: selectedColor === c ? 3 : 0,
                    borderColor: colors.foreground,
                    transform: [{ scale: selectedColor === c ? 1.15 : 1 }],
                  }} />
                </Pressable>
              ))}
            </View>

            {/* Icon picker */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>Ícone</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {ICONS.map((icon) => (
                <Pressable key={icon} onPress={() => setSelectedIcon(icon)}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 12,
                    backgroundColor: selectedIcon === icon ? selectedColor + '25' : colors.surface,
                    borderWidth: 2,
                    borderColor: selectedIcon === icon ? selectedColor : colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MaterialIcons
                      name={icon}
                      size={22}
                      color={selectedIcon === icon ? selectedColor : colors.muted}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Save */}
            <Pressable onPress={handleSave} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
              <View style={{ backgroundColor: colors.tint, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Salvar</Text>
              </View>
            </Pressable>

            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, marginTop: 10 }]}>
              <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, alignItems: 'center' }}>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>Cancelar</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
