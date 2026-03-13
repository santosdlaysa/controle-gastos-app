# Controle de Gastos v2.0

Aplicativo mobile/web full-stack para controle financeiro pessoal — rastreamento de despesas por categoria, gerenciamento de receitas e orçamentos, integração bancária via Pluggy, acompanhamento de ganhos Uber e assistente financeiro com IA.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Instalação e Configuração](#instalação-e-configuração)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Telas e Navegação](#telas-e-navegação)
- [Autenticação](#autenticação)
- [API (tRPC)](#api-trpc)
- [Banco de Dados](#banco-de-dados)
- [Integração com o Pluggy](#integração-com-o-pluggy)
- [Rastreamento Uber](#rastreamento-uber)
- [Assistente Financeiro (IA)](#assistente-financeiro-ia)
- [Hooks Customizados](#hooks-customizados)
- [Tipos e Modelos de Dados](#tipos-e-modelos-de-dados)
- [Suporte a Plataformas](#suporte-a-plataformas)

---

## Visão Geral

O **Controle de Gastos** é um aplicativo full-stack construído com React Native + Expo, voltado para controle financeiro pessoal. Ele permite:

- Registrar e categorizar despesas mensais (manual ou via importação bancária)
- Configurar receitas (salário, vale, outros) e orçamentos por categoria
- Acompanhar histórico mensal com resumos analíticos
- Conectar contas bancárias para importar transações automaticamente via [Pluggy](https://pluggy.ai)
- Rastrear ganhos e gastos como motorista Uber (com exportação CSV e PDF)
- Conversar com um assistente financeiro baseado em IA para insights sobre os gastos do mês
- Gerenciar perfil (nome) e excluir conta com todos os dados
- Selecionar modo de uso: finanças pessoais ou modo Uber
- Autenticar via e-mail/senha ou OAuth

Todos os dados são persistidos em PostgreSQL, com acesso via tRPC type-safe.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework mobile/web | React Native + Expo 54 |
| Linguagem | TypeScript 5.9 |
| Roteamento | Expo Router 6 |
| Estilização | NativeWind 4 (Tailwind CSS) |
| Estado / cache | TanStack React Query 5 |
| API type-safe | tRPC 11 |
| Backend HTTP | Express.js |
| Banco de dados | PostgreSQL + Drizzle ORM 0.44 |
| Autenticação | E-mail/senha local + Manus OAuth |
| Armazenamento nativo | expo-secure-store |
| Integração bancária | Pluggy API + react-native-pluggy-connect |
| Validação de schema | Zod 4 |
| Testes | Vitest |
| Gerenciador de pacotes | pnpm 9 |

---

## Estrutura do Projeto

```
controle-gastos-app/
├── app/                          # Telas (Expo Router — file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx             # Home — dashboard de despesas
│   │   ├── history.tsx           # Histórico mensal analítico
│   │   ├── assistant.tsx         # Assistente financeiro com IA
│   │   ├── settings.tsx          # Receitas, orçamentos, integrações, perfil
│   │   ├── uber-earnings.tsx     # Ganhos e gastos Uber (aba oculta)
│   │   └── _layout.tsx           # Layout de abas (4 tabs)
│   ├── _layout.tsx               # Layout raiz (providers, auth gate)
│   ├── login.tsx                 # Login / cadastro (e-mail ou OAuth)
│   ├── mode-select.tsx           # Seleção de modo (pessoal ou Uber)
│   ├── uber-earnings.tsx         # Ganhos e gastos Uber (rota legada)
│   ├── oauth/
│   │   └── callback.tsx          # Handler de redirect OAuth
│   └── dev/
│       └── theme-lab.tsx         # Showcase de componentes (dev only)
│
├── components/                   # Componentes React Native reutilizáveis
│   ├── expense-item.tsx          # Item de despesa na lista
│   ├── expense-modal.tsx         # Modal criar/editar despesa
│   ├── uber-earning-item.tsx     # Item de ganho/gasto Uber
│   ├── uber-earning-modal.tsx    # Modal criar/editar entrada Uber
│   ├── screen-container.tsx      # Wrapper com safe area e background
│   ├── themed-view.tsx           # Container com suporte a tema
│   ├── haptic-tab.tsx            # Tab bar com feedback háptico
│   ├── parallax-scroll-view.tsx  # Scroll com efeito parallax
│   ├── external-link.tsx         # Link que abre no browser externo
│   └── ui/                       # Componentes primitivos
│       ├── collapsible.tsx
│       ├── icon-symbol.tsx
│       └── icon-symbol.ios.tsx
│
├── hooks/                        # Hooks customizados
│   ├── use-auth.ts               # Estado e operações de autenticação
│   ├── use-expenses.ts           # CRUD de despesas + cálculos financeiros
│   ├── use-pluggy.ts             # Integração bancária (Pluggy)
│   ├── use-uber-earnings.ts      # CRUD de ganhos/gastos Uber
│   ├── use-migration.ts          # Migração AsyncStorage → servidor
│   ├── use-colors.ts             # Cores do tema atual
│   ├── use-color-scheme.ts       # Detecção dark/light mode
│   └── use-nubank-listener.ts    # Ouvinte de notificações Nubank
│
├── lib/                          # Utilitários e clientes
│   ├── trpc.ts                   # Setup do cliente tRPC
│   ├── auth-context.tsx          # Context provider de autenticação
│   ├── theme-provider.tsx        # Context de tema (dark/light)
│   ├── pluggy-storage.ts         # AsyncStorage para conexões Pluggy
│   ├── pluggy-category-map.ts    # Mapeamento categorias Pluggy → app
│   ├── pluggy-expense-storage.ts # Merge/dedup de transações importadas
│   ├── notification-settings.ts
│   ├── nubank-notification-parser.ts
│   └── _core/
│       ├── api.ts                # Wrapper de fetch com autenticação
│       ├── auth.ts               # Armazenamento seguro de tokens
│       └── manus-runtime.ts      # Integração OAuth Manus
│
├── types/                        # Tipos TypeScript globais
│   ├── expense.ts                # Expense, Income, Budget
│   ├── pluggy.ts                 # PluggyConnection, PluggySyncedExpense
│   └── uber-earnings.ts          # UberEntry, UberEarningCategory
│
├── server/                       # Backend Node.js / Express
│   ├── routers.ts                # Montagem do appRouter principal
│   ├── expense-router.ts         # tRPC — CRUD de despesas
│   ├── expense-db.ts             # Acesso ao banco: despesas, receitas, orçamentos
│   ├── income-router.ts          # tRPC — receitas
│   ├── budget-router.ts          # tRPC — orçamentos e categorias
│   ├── history-router.ts         # tRPC — resumos mensais
│   ├── pluggy-router.ts          # tRPC — integração bancária
│   ├── pluggy.ts                 # Wrapper da API REST do Pluggy
│   ├── uber-earnings-router.ts   # tRPC — ganhos/gastos Uber
│   ├── uber-earnings-db.ts       # Acesso ao banco: tabela uber_earnings
│   ├── migration-router.ts       # tRPC — exportação/importação de dados legados
│   ├── admin-router.ts           # tRPC — painel DB admin (tabelas, SQL)
│   ├── assistant-router.ts       # tRPC — assistente financeiro IA
│   ├── bank-router.ts            # tRPC — bancos/cartões do usuário
│   ├── profile-router.ts         # tRPC — perfil e exclusão de conta
│   ├── export-expenses.ts        # Exportação de despesas (CSV/JSON)
│   ├── db.ts                     # Conexão com banco + upsert de usuário
│   ├── db-migrate.ts             # Migração automática do schema
│   ├── storage.ts                # Helpers de armazenamento S3
│   └── _core/
│       ├── index.ts              # Entry point do servidor Express
│       ├── context.ts            # Criação do contexto tRPC
│       ├── trpc.ts               # Setup tRPC (middlewares, procedures)
│       ├── oauth.ts              # Rotas de callback OAuth
│       ├── local-auth.ts         # Rotas de registro/login por e-mail
│       ├── env.ts                # Variáveis de ambiente tipadas
│       ├── cookies.ts            # Gerenciamento de cookies de sessão
│       └── llm.ts                # Integração com LLM (OpenAI)
│
├── drizzle/                      # ORM e migrações
│   ├── schema.ts                 # Schema do banco de dados (PostgreSQL)
│   └── migrations/               # Migrações geradas automaticamente
│
├── shared/                       # Código compartilhado (client + server)
│   ├── types.ts                  # Re-exporta tipos do schema
│   ├── expense-utils.ts          # parseQuantity, detectSource, getNextMonth
│   └── const.ts                  # COOKIE_NAME, ONE_YEAR_MS, mensagens de erro
│
├── constants/
│   ├── oauth.ts                  # URLs OAuth, deep link scheme
│   ├── const.ts                  # Constantes do app
│   └── theme.ts                  # Definições de tema
│
├── app.config.ts                 # Configuração Expo
├── drizzle.config.ts             # Configuração Drizzle ORM
├── tailwind.config.js            # Configuração Tailwind CSS
├── metro.config.js               # Configuração Metro bundler
├── tsconfig.json                 # Configuração TypeScript
└── package.json
```

---

## Funcionalidades

### Controle de Despesas
- Adicionar, editar e remover despesas mensais
- 7 categorias: Transporte, Alimentação, Moradia, Saúde, Educação, Lazer e Outro
- Campo de parcelamento (ex: "3/12" para a 3ª parcela de 12 — com geração automática das próximas)
- Navegação por mês (anterior/próximo)
- Mover despesa para o próximo mês
- Filtros: por categoria, apenas não pagas, apenas parceladas
- Marcação de despesa como paga/não paga

### Dashboard Financeiro
- Receita total do mês (Salário + Vale + Outros, com suporte a override mensal)
- Soma de todas as despesas do mês
- Saldo = Receita − Despesas (verde se positivo, vermelho se negativo)
- Indicador visual de uso do orçamento por categoria

### Receitas e Orçamentos
- Configurar salário, vale-alimentação e outras entradas
- Definir orçamento total mensal
- Definir orçamento individual por categoria
- Override de receita por mês específico

### Histórico
- Resumos analíticos por mês
- Tendências e comparações entre períodos

### Integração Bancária (Pluggy)
- Conectar contas de bancos brasileiros via widget oficial
- Importar transações automaticamente
- Mapeamento automático de categorias bancárias → categorias do app
- Deduplicação por `clientId` (sem importações repetidas)
- Suporte a múltiplas contas

### Rastreamento Uber
- Registrar corridas, entregas e outros ganhos
- Registrar gastos: combustível, manutenção, pedágio, lavagem, seguro, outros
- Visão mensal de ganhos vs. gastos

### Notificações (Nubank)
- Listener de notificações do Nubank para captura automática de transações

### Assistente Financeiro (IA)
- Chat com IA contextualizada nos dados do mês (despesas, receita, orçamento)
- Respostas com insights, padrões de gastos e sugestões de economia
- Acesso via aba dedicada "Assistente"

### Perfil e Conta
- Atualizar nome de usuário
- Excluir conta com remoção completa de todos os dados associados

### Modo de Uso
- Seleção de modo na inicialização: **Pessoal** (controle de despesas) ou **Uber** (motorista)
- No modo Uber, a aba inicial redireciona para a tela de ganhos

### Exportação de Ganhos Uber
- Exportar entradas do mês em CSV ou PDF para análise externa

### Painel Admin (DB)
- Disponível apenas para usuários com `role: "admin"`
- Visualizar tabelas do banco de dados, dados por tabela e executar SQL direto

---

## Instalação e Configuração

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL (ou banco hospedado no Render.com)

### Passos

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd controle-gastos-app

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Aplique o schema no banco de dados
pnpm db:push

# 5. Inicie o app em modo desenvolvimento
pnpm dev
```

O comando `pnpm dev` inicia o servidor Express (porta 3000+) e o Metro bundler (porta 8081) em paralelo.

> **Nota sobre o banco de dados:** Se o banco estiver hospedado no Render.com, a conexão requer acesso TCP na porta 5432. Em redes com firewall restrito, execute `pnpm db:push` diretamente no servidor ou via VPN/tunel.

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia servidor + Metro (desenvolvimento) |
| `pnpm dev:server` | Apenas o servidor Express com hot reload |
| `pnpm dev:metro` | Apenas o Metro bundler (Expo) — web |
| `pnpm dev:android` | Servidor + Metro com foco Android |
| `pnpm web` | Inicia o Expo no modo web |
| `pnpm android` | Inicia no emulador/dispositivo Android |
| `pnpm ios` | Inicia no simulador iOS |
| `pnpm build` | Compila o servidor para produção (`dist/`) |
| `pnpm start` | Inicia o servidor em modo produção |
| `pnpm check` | Verifica tipos TypeScript sem compilar |
| `pnpm lint` | Executa ESLint |
| `pnpm format` | Formata o código com Prettier |
| `pnpm test` | Executa testes com Vitest |
| `pnpm db:push` | Aplica o schema no banco de dados |
| `pnpm qr` | Gera QR Code para acesso mobile |

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

### Servidor

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `DATABASE_URL` | Sim | String de conexão PostgreSQL (ex: `postgresql://user:pass@host/db`) |
| `JWT_SECRET` | Sim | Segredo para assinar tokens de sessão JWT |
| `VITE_APP_ID` | Sim | ID do app no Manus OAuth |
| `OAUTH_SERVER_URL` | Sim | URL do backend Manus OAuth |
| `OWNER_OPEN_ID` | Não | OpenID do dono do app (recebe role `admin`) |
| `PLUGGY_CLIENT_ID` | Não | Client ID da conta Pluggy |
| `PLUGGY_CLIENT_SECRET` | Não | Client Secret da conta Pluggy |

### Expo (cliente)

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `EXPO_PUBLIC_API_BASE_URL` | Sim | URL base da API (ex: `http://localhost:3000`) |
| `EXPO_PUBLIC_APP_ID` | Sim | ID do app para OAuth no cliente |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | Sim | URL do portal de login OAuth |
| `EXPO_PUBLIC_OAUTH_SERVER_URL` | Sim | URL do servidor OAuth |
| `EXPO_PUBLIC_OWNER_OPEN_ID` | Não | OpenID do dono (detecta role admin no cliente) |

---

## Telas e Navegação

O app usa navegação por abas (bottom tabs) com Expo Router. Ao iniciar pela primeira vez, o usuário passa pela tela de seleção de modo.

### Tela: Seleção de Modo (`/mode-select`)

- Escolha entre modo **Pessoal** (controle de despesas) e modo **Uber** (motorista)
- O modo selecionado persiste entre sessões

### Aba: Home (`/`)

Tela principal com:
- Seletor de mês (navegação anterior/próximo)
- Painel de resumo: Receita Total, Total de Despesas, Saldo
- Lista de despesas do mês com categoria e parcelamento
- Filtros por categoria, status de pagamento e tipo
- Botão flutuante para adicionar nova despesa
- Menu de ações em lote (gerar parcelas, mover mês, etc.)
- No modo Uber, redireciona automaticamente para a aba de ganhos

### Aba: Histórico (`/history`)

- Resumos mensais agregados
- Tendências de gastos ao longo do tempo
- Comparação entre meses

### Aba: Assistente (`/assistant`)

- Chat com assistente financeiro alimentado por IA (OpenAI)
- Contexto automático: despesas, receita e orçamento do mês atual
- Respostas em português com análise de padrões de gastos

### Aba: Configurações (`/settings`)

- Definir Salário, Vale e Outros rendimentos
- Configurar orçamento total e por categoria
- Gerenciar conexões bancárias (Pluggy)
- Editar nome de perfil
- Excluir conta permanentemente
- Alternar entre tema claro e escuro
- Botão de logout
- Painel de banco de dados (admin only)

### Tela: Login (`/login`)

- Formulário de e-mail e senha (cadastro ou login)
- Botão de login via OAuth (Manus)
- Redirecionamento automático ao home se já autenticado

### Tela: Ganhos Uber (`/uber-earnings`)

- Lista de entradas do mês (ganhos e gastos)
- Navegação por mês
- Botão para adicionar nova entrada
- Resumo: total ganho vs. total gasto no mês
- Exportação para CSV e PDF

### Modal de Despesa

Formulário de criação/edição com:
- Nome da despesa
- Categoria (7 opções)
- Valor (R$)
- Parcelas (ex: "2/6")
- Data
- Status de pagamento (pago/não pago)

---

## Autenticação

O app suporta dois métodos de autenticação.

### E-mail e Senha (Local Auth)

```
POST /api/auth/register   → Cadastro com e-mail + senha
POST /api/auth/login      → Login com e-mail + senha
```

- Senha armazenada com hash scrypt (salt + 64 bytes)
- Retorna `{ token, user }` — token armazenado em SecureStore (mobile) ou localStorage (web)

### OAuth (Manus)

1. Cliente chama `startOAuthLogin()`
2. Browser é aberto com URL do portal OAuth
3. Após autenticação, redirect para:
   - **Web**: `GET /api/oauth/callback?code=X&state=Y`
   - **Mobile**: deep link `manus{id}://oauth/callback?code=X&state=Y`
4. Backend troca o código pelo token, sincroniza usuário no banco e define cookie de sessão
5. Cliente armazena token e navega para o home

### Persistência de Sessão

| Plataforma | Armazenamento do Token |
|-----------|----------------------|
| iOS / Android | `expo-secure-store` (criptografado) |
| Web | `localStorage` + cookie `app_session_id` (HttpOnly) |

### Hook de Autenticação

```tsx
import { useAuth } from "@/hooks/use-auth";

function MyScreen() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) return <ActivityIndicator />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  return <Text>Olá, {user.name}</Text>;
}
```

### Objeto `user`

```typescript
interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string;
  role: "user" | "admin";
  lastSignedIn: Date;
}
```

---

## API (tRPC)

A API usa tRPC 11 sobre HTTP com batching e autenticação via JWT.

**URL base:** `POST /api/trpc`

Todas as rotas marcadas como **Protegido** exigem `Authorization: Bearer <token>` ou cookie `app_session_id`.

### Rotas disponíveis

#### Sistema

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `system.health` | Query | Público | Verificação de saúde da API |
| `auth.me` | Query | Público | Retorna o usuário autenticado ou `null` |
| `auth.logout` | Mutation | Público | Limpa o cookie de sessão |

#### Despesas

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `expense.getByMonth` | Query | Protegido | Lista despesas do mês (`YYYY-MM`) |
| `expense.create` | Mutation | Protegido | Cria uma despesa |
| `expense.update` | Mutation | Protegido | Atualiza campos de uma despesa |
| `expense.delete` | Mutation | Protegido | Remove uma despesa |
| `expense.bulkCreate` | Mutation | Protegido | Cria múltiplas despesas (dedup automático) |

#### Receitas

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `income.get` | Query | Protegido | Retorna a receita global do usuário |
| `income.update` | Mutation | Protegido | Atualiza salário, vale e outros |

#### Orçamentos

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `budget.get` | Query | Protegido | Retorna orçamento total e por categoria do mês |
| `budget.updateTotal` | Mutation | Protegido | Define orçamento total do mês |
| `budget.updateIncomeOverride` | Mutation | Protegido | Define/limpa override de receita do mês |
| `budget.updateCategories` | Mutation | Protegido | Atualiza orçamentos por categoria |

#### Histórico

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `history.getSummaries` | Query | Protegido | Resumos mensais agregados |

#### Pluggy (Integração Bancária)

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `pluggy.createConnectToken` | Mutation | Protegido | Gera token para o widget Pluggy |
| `pluggy.syncTransactions` | Mutation | Protegido | Sincroniza transações de uma conta |
| `pluggy.syncAndSave` | Mutation | Protegido | Sincroniza e salva no banco |

#### Ganhos Uber

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `uberEarnings.getByMonth` | Query | Protegido | Lista entradas do mês |
| `uberEarnings.create` | Mutation | Protegido | Cria uma entrada |
| `uberEarnings.update` | Mutation | Protegido | Atualiza uma entrada |
| `uberEarnings.delete` | Mutation | Protegido | Remove uma entrada |

#### Migração

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `migration.importData` | Mutation | Protegido | Importa dados do AsyncStorage legado |

#### Assistente Financeiro

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `assistant.chat` | Mutation | Protegido | Envia mensagem ao assistente IA com contexto financeiro do mês |

#### Perfil

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `profile.updateName` | Mutation | Protegido | Atualiza o nome de exibição do usuário |
| `profile.deleteAccount` | Mutation | Protegido | Remove a conta e todos os dados do usuário |

#### Bancos

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `bank.getAll` | Query | Protegido | Retorna a lista de bancos/cartões cadastrados pelo usuário |

#### Admin

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `admin.getTables` | Query | Protegido | Lista tabelas do banco de dados |
| `admin.getTableData` | Query | Protegido | Retorna até 100 linhas de uma tabela |
| `admin.executeSQL` | Mutation | Protegido | Executa SQL arbitrário (admin only) |

### Exemplo de uso no cliente

```tsx
import { trpc } from "@/lib/trpc";

// Query com parâmetro
const { data: expenses } = trpc.expense.getByMonth.useQuery("2026-03");

// Mutation
const createMutation = trpc.expense.create.useMutation({
  onSuccess: () => utils.expense.getByMonth.invalidate(),
});

createMutation.mutate({
  name: "Mercado",
  category: "alimentacao",
  value: 250.0,
  date: "2026-03-05",
  month: "2026-03",
});
```

---

## Banco de Dados

O banco de dados é PostgreSQL, hospedado no Render.com. O schema é gerenciado via Drizzle ORM.

### Tabelas

#### `users`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | ID auto-incrementado |
| `openId` | varchar(64) unique | `email:{email}` ou ID do provedor OAuth |
| `name` | text | Nome do usuário |
| `email` | varchar(320) | E-mail |
| `loginMethod` | varchar(64) | `"email"`, `"google"`, etc. |
| `passwordHash` | varchar(255) | Hash scrypt (apenas login local) |
| `role` | enum | `"user"` ou `"admin"` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `lastSignedIn` | timestamp | |

#### `expenses`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int FK | Referência a `users.id` |
| `clientId` | varchar(128) | ID externo (`pluggy_*`, `nubank_*`) ou `NULL` (manual) |
| `name` | varchar(255) | Nome da despesa |
| `category` | enum | transporte \| alimentacao \| moradia \| saude \| educacao \| lazer \| outro |
| `value` | numeric(10,2) | Valor em reais |
| `date` | varchar(30) | Data ISO (ex: `"2026-03-05"`) |
| `month` | varchar(7) | Formato `"YYYY-MM"` |
| `quantity` | varchar(20) | Parcelamento (ex: `"3/12"`) |
| `paid` | boolean | Status de pagamento |
| `source` | enum | `manual` \| `pluggy` \| `nubank` |
| `bank` | varchar(100) | Banco/cartão associado (opcional) |

> **Índice único:** `(userId, clientId)` — impede duplicatas de importações bancárias. `clientId = NULL` não participa do índice, permitindo múltiplas despesas manuais.

#### `incomes`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int unique | Uma linha por usuário |
| `salary` | numeric(10,2) | Salário |
| `vale` | numeric(10,2) | Vale-alimentação / refeição |
| `other` | numeric(10,2) | Outras entradas |
| `updatedAt` | timestamp | |

#### `budgets`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int | |
| `month` | varchar(7) | Formato `"YYYY-MM"` |
| `totalBudget` | numeric(10,2) | Orçamento total do mês |
| `incomeOverride` | numeric(10,2) | Override de receita para o mês (opcional) |

> **Índice único:** `(userId, month)`

#### `category_budgets`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int | |
| `month` | varchar(7) | |
| `category` | enum | Mesmas 7 categorias de despesas |
| `amount` | numeric(10,2) | Orçamento da categoria |

> **Índice único:** `(userId, month, category)`

#### `banks`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int | |
| `name` | varchar(100) | Nome do banco/cartão (ex: "Nubank") |
| `createdAt` | timestamp | |

> **Índice único:** `(userId, name)` — cada banco aparece uma única vez por usuário.

#### `uber_earnings`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | int PK | |
| `userId` | int | |
| `description` | varchar(255) | Descrição da entrada |
| `category` | varchar(50) | Categoria (corrida, uber_eats, combustivel, etc.) |
| `entryType` | varchar(10) | `"ganho"` (receita) ou `"gasto"` (despesa) |
| `value` | numeric(10,2) | Valor |
| `date` | varchar(30) | Data ISO |
| `month` | varchar(7) | Formato `"YYYY-MM"` |

### Comandos

```bash
# Aplicar schema no banco (criar/atualizar tabelas)
pnpm db:push
```

### Notas sobre o banco

- Valores numéricos retornados pelo Drizzle como `string` — use `parseFloat()` no cliente
- IDs retornados como `number` — converta com `.toString()` para compatibilidade com a UI
- SSL obrigatório para conexão com Render.com (`rejectUnauthorized: false` no config)

---

## Integração com o Pluggy

O [Pluggy](https://pluggy.ai) é uma plataforma de open banking que permite conectar contas bancárias brasileiras.

### Fluxo de integração

1. O usuário abre o widget Pluggy via `pluggy.openConnect()`
2. O app solicita um Connect Token via `trpc.pluggy.createConnectToken`
3. O usuário autentica no banco de sua escolha dentro do widget
4. Ao fechar o widget, o `itemId` é passado para `pluggy.syncAndSave(itemId, from, to)`
5. O servidor busca todas as contas do item, itera pelas transações DÉBITO no período
6. Mapeia categorias Pluggy → categorias do app
7. Insere em massa com `ON CONFLICT DO NOTHING` (deduplicação automática)

### Mapeamento de categorias

```
Pluggy (EN/PT)         → Categoria do App
─────────────────────────────────────────
food / restaurants     → alimentacao
transportation / travel → transporte
housing / rent         → moradia
health / pharmacy      → saude
education              → educacao
entertainment / leisure → lazer
(outros / não mapeado) → outro
```

### Arquivos relacionados

| Arquivo | Descrição |
|---------|-----------|
| `hooks/use-pluggy.ts` | Hook: `enabled`, `connections`, `syncing`, `syncAll`, `openConnect`, `disconnect` |
| `lib/pluggy-storage.ts` | Persistência de conexões em AsyncStorage |
| `lib/pluggy-category-map.ts` | Mapa de categorias (30+ entradas) |
| `server/pluggy.ts` | Wrapper da API REST do Pluggy |
| `server/pluggy-router.ts` | Roteador tRPC com `createConnectToken`, `syncTransactions`, `syncAndSave` |
| `types/pluggy.ts` | Tipos TypeScript: `PluggyConnection`, `PluggySyncedExpense` |

---

## Rastreamento Uber

A tela `/uber-earnings` permite registrar entradas mensais como motorista Uber.

### Categorias de ganho (`entryType: "ganho"`)

| Categoria | Descrição |
|-----------|-----------|
| `corrida` | Corridas de passageiros |
| `uber_eats` | Entregas Uber Eats |
| `bonus` | Bônus e incentivos |
| `outro_ganho` | Outros ganhos |

### Categorias de gasto (`entryType: "gasto"`)

| Categoria | Descrição |
|-----------|-----------|
| `combustivel` | Combustível |
| `manutencao` | Manutenção do veículo |
| `pedagio` | Pedágios |
| `lavagem` | Lavagem do carro |
| `seguro` | Seguro |
| `outro_gasto` | Outros gastos |

### Hook

```tsx
import { useUberEarnings } from "@/hooks/use-uber-earnings";

const { entries, totalEarnings, totalExpenses, create, update, remove } =
  useUberEarnings(currentMonth);
```

---

## Assistente Financeiro (IA)

A aba `/assistant` oferece um chat com IA contextualizado nos dados financeiros do mês.

### Contexto injetado automaticamente

- Renda total (salário + vale + outros)
- Total de despesas e saldo
- Orçamento do mês e percentual utilizado
- Resumo por categoria (ordenado por valor)

### Fluxo

1. Usuário abre a aba "Assistente"
2. O cliente envia as mensagens + mês atual via `assistant.chat`
3. O servidor busca dados do banco em paralelo e monta um `systemPrompt`
4. O prompt é enviado ao LLM (OpenAI) via `invokeLLM`
5. A resposta em texto é retornada ao cliente

### Arquivo relacionado

| Arquivo | Descrição |
|---------|-----------|
| `app/(tabs)/assistant.tsx` | Tela de chat |
| `server/assistant-router.ts` | Roteador tRPC + montagem do contexto |
| `server/_core/llm.ts` | Wrapper do cliente OpenAI |

---

## Hooks Customizados

### `useAuth`

```tsx
const { user, isAuthenticated, loading, error, applyLogin, logout } = useAuth();
```

| Retorno | Tipo | Descrição |
|---------|------|-----------|
| `user` | `User \| null` | Usuário autenticado |
| `isAuthenticated` | `boolean` | Se há sessão ativa |
| `loading` | `boolean` | Aguardando validação do token |
| `applyLogin` | `(token, user) => void` | Aplica login no contexto |
| `logout` | `() => void` | Limpa sessão e redireciona |

---

### `useExpenses(month?)`

```tsx
const {
  expenses,
  income,
  totalExpenses,
  balance,
  budget,
  categoryBudgets,
  isLoading,
  addExpense,
  updateExpense,
  deleteExpense,
  moveToNextMonth,
} = useExpenses("2026-03");
```

| Retorno | Descrição |
|---------|-----------|
| `expenses` | Lista de despesas do mês |
| `income` | Objeto com `salary`, `vale`, `other` |
| `totalExpenses` | Soma de todas as despesas |
| `balance` | Receita − Despesas |
| `budget` | Orçamento total do mês |
| `categoryBudgets` | Orçamento por categoria |
| `addExpense` | Cria nova despesa |
| `updateExpense` | Atualiza despesa existente |
| `deleteExpense` | Remove despesa |
| `moveToNextMonth` | Move despesa para o mês seguinte |

---

### `usePluggy`

```tsx
const { enabled, connections, syncing, syncAll, openConnect, disconnect } =
  usePluggy();
```

---

### `useMigration`

Executa automaticamente na inicialização do app se houver dados no AsyncStorage legado.

```tsx
const { state, isNeeded, isDone, runMigration } = useMigration();
// state: "idle" | "checking" | "running" | "done" | "error"
```

---

## Tipos e Modelos de Dados

### `Expense`

```typescript
interface Expense {
  id: string;           // ID do banco (convertido para string)
  name: string;
  category: Category;
  value: number;
  date: string;         // ISO 8601: "2026-03-05"
  month: string;        // "YYYY-MM": "2026-03"
  quantity?: string;    // Parcelamento: "3/12"
  paid?: boolean;
  source: "manual" | "pluggy" | "nubank";
  clientId?: string;    // ID externo (Pluggy ou Nubank)
  bank?: string | null; // Banco/cartão (ex: "Nubank", "Bradesco")
}

type Category =
  | "transporte"
  | "alimentacao"
  | "moradia"
  | "saude"
  | "educacao"
  | "lazer"
  | "outro";
```

### `Income`

```typescript
interface Income {
  salary: number;
  vale: number;
  other: number;
}
```

### `Budget`

```typescript
interface Budget {
  month: string;          // "YYYY-MM"
  totalBudget: number;
  incomeOverride?: number; // Substitui salary+vale+other se definido
}

interface CategoryBudget {
  category: Category;
  amount: number;
}
```

### `UberEntry`

```typescript
interface UberEntry {
  id: string;
  description: string;
  category: string;
  entryType: "ganho" | "gasto";
  value: number;
  date: string;
  month: string;
}
```

---

## Utilitários Compartilhados (`shared/expense-utils.ts`)

```typescript
// Parseia string de parcelamento
parseQuantity("3/12")
// → { current: 3, total: 12 }

// Detecta a origem da despesa pelo clientId
detectSource("pluggy_abc123") // → "pluggy"
detectSource("nubank_xyz")    // → "nubank"
detectSource(null)            // → "manual"

// Calcula o próximo mês
getNextMonth("2026-02") // → "2026-03"
getNextMonth("2026-12") // → "2027-01"
```

---

## Suporte a Plataformas

| Plataforma | Status | Notas |
|-----------|--------|-------|
| Android | Suportado | SDK mínimo 24 |
| iOS | Suportado | Sem criptografia de exportação (flag `iTSAppUsesNonExemptEncryption: false`) |
| Web | Suportado | Via Expo Web + Metro, autenticação via cookie |
