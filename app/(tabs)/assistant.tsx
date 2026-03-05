import { View, Text, ScrollView } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

const FEATURES = [
  { icon: 'insights' as const, label: 'Análise dos seus gastos por categoria e mês' },
  { icon: 'trending-down' as const, label: 'Identificação de padrões e oportunidades de economia' },
  { icon: 'question-answer' as const, label: 'Perguntas em linguagem natural sobre suas finanças' },
  { icon: 'summarize' as const, label: 'Resumos e relatórios inteligentes automáticos' },
];

export default function AssistantScreen() {
  const colors = useColors();

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: '#1e1b4b',
            paddingTop: 20,
            paddingBottom: 36,
            paddingHorizontal: 24,
            alignItems: 'center',
          }}
        >
          {/* Badge */}
          <View
            style={{
              backgroundColor: 'rgba(167,139,250,0.2)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 5,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(167,139,250,0.3)',
            }}
          >
            <Text style={{ color: '#C4B5FD', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Em Breve
            </Text>
          </View>

          {/* Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(167,139,250,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(167,139,250,0.2)',
            }}
          >
            <MaterialIcons name="auto-awesome" size={40} color="#A78BFA" />
          </View>

          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 }}>
            Assistente Financeiro
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            Seu consultor pessoal com IA, disponível em breve.
          </Text>
        </View>

        {/* Content */}
        <View style={{ padding: 24, flex: 1 }}>

          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
            O que está chegando
          </Text>

          <View style={{ gap: 10 }}>
            {FEATURES.map((f, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#A78BFA18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name={f.icon} size={18} color="#A78BFA" />
                </View>
                <Text style={{ flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 }}>
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Info box */}
          <View
            style={{
              marginTop: 24,
              borderRadius: 14,
              padding: 16,
              backgroundColor: '#A78BFA10',
              borderWidth: 1,
              borderColor: '#A78BFA30',
              flexDirection: 'row',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <MaterialIcons name="info-outline" size={18} color="#A78BFA" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.muted, lineHeight: 19 }}>
              O assistente estará disponível assim que a integração com IA for reativada. Seus dados já estão sendo coletados e prontos para análise.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
