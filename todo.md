# Project TODO - Controle de Gastos Mensais

## Branding & Setup
- [x] Gerar logo customizado para o aplicativo
- [x] Atualizar app.config.ts com nome e logo do app

## Core Features
- [x] Tela Home com lista de despesas do mês
- [x] Resumo financeiro (renda total, despesas totais, saldo restante)
- [x] Adicionar nova despesa (modal com formulário)
- [x] Editar despesa existente
- [x] Deletar despesa (com confirmação)
- [x] Navegação entre meses
- [x] Tela de Configurações de Renda (salário, vale, outros)
- [x] Persistência de dados com AsyncStorage
- [x] Categorização de despesas com cores diferentes

## UI/UX
- [x] Implementar ScreenContainer para todas as screens
- [x] Estilizar componentes com NativeWind/Tailwind
- [x] Adicionar ícones às abas de navegação
- [x] Implementar feedback visual (press states, haptics)
- [x] Validação de formulários
- [x] Mensagens de sucesso/erro

## Testing & Polish
- [ ] Testar fluxos principais no Expo Go
- [ ] Testar navegação entre telas
- [ ] Testar persistência de dados
- [ ] Testar dark mode
- [ ] Verificar responsividade em diferentes tamanhos de tela

## Bugs Reportados
- [x] Renda total não carrega o valor salvo em Configurações
- [x] Dados são perdidos quando o app é fechado e aberto novamente

## Novas Funcionalidades Integradas
- [x] Tela de histórico de compras
- [x] Utilitários de upload de imagens
- [x] Parsers de notificações do Nubank (stub - dependência não disponível)
- [x] Storage de configurações
