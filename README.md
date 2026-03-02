# Controle de Gastos

Aplicativo mobile/web para controle financeiro pessoal, com rastreamento de despesas, configuração de receitas e integração com bancos via Pluggy.

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
- [API (tRPC)](#api-trpc)
- [Integração com o Pluggy](#integração-com-o-pluggy)
- [Banco de Dados](#banco-de-dados)
- [Autenticação](#autenticação)
- [Armazenamento Local](#armazenamento-local)
- [Tipos e Modelos de Dados](#tipos-e-modelos-de-dados)

---

## Visão Geral

O **Controle de Gastos** é um aplicativo full-stack construído com React Native + Expo, voltado para controle financeiro pessoal. Ele permite ao usuário registrar despesas mensais por categoria, configurar fontes de receita (salário, vale, outros), acompanhar o saldo e, opcionalmente, conectar contas bancárias para importar transações automaticamente via [Pluggy](https://pluggy.ai).

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
| Banco de dados | MySQL + Drizzle ORM |
| Autenticação | Manus OAuth |
| Armazenamento nativo | AsyncStorage + expo-secure-store |
| Integração bancária | Pluggy API + react-native-pluggy-connect |
| Validação de schema | Zod |
| Testes | Vitest |
| Gerenciador de pacotes | pnpm 9 |

---

## Estrutura do Projeto

```
controle-gastos-app/
├── app/                        # Telas (Expo Router)
│   ├── (tabs)/
│   │   ├── index.tsx           # Tela principal — lista de despesas
│   │   └── settings.tsx        # Configuração de receitas
│   ├── _layout.tsx             # Layout raiz (providers, auth)
│   ├── oauth/
│   │   └── callback.tsx        # Handler de redirect OAuth
│   └── dev/
│       └── theme-lab.tsx       # Showcase de componentes (dev only)
│
├── components/                 # Componentes reutilizáveis
│   ├── ExpenseItem.tsx         # Item de despesa na lista
│   ├── ExpenseModal.tsx        # Modal de criação/edição de despesa
│   ├── ScreenContainer.tsx     # Wrapper com safe area
│   └── ThemedView.tsx          # Container com suporte a tema
│
├── hooks/                      # Hooks customizados
│   ├── use-auth.ts             # Estado de autenticação
│   ├── use-expenses.ts         # CRUD de despesas e cálculos
│   └── use-pluggy.ts           # Integração com bancos (Pluggy)
│
├── lib/                        # Utilitários e storage
│   ├── pluggy-category-map.ts  # Mapeamento de categorias bancárias
│   ├── pluggy-expense-storage.ts # Merge de transações importadas
│   ├── pluggy-storage.ts       # Persistência de conexões Pluggy
│   └── trpc.ts                 # Cliente tRPC
│
├── server/                     # Backend Node.js
│   ├── routers.ts              # Rotas tRPC (auth, pluggy)
│   ├── pluggy-router.ts        # Roteador de integração bancária
│   ├── pluggy.ts               # Wrapper da API Pluggy
│   ├── db.ts                   # Helpers de banco de dados
│   ├── storage.ts              # Helpers de armazenamento S3
│   └── _core/                  # Infraestrutura (não editar)
│       ├── index.ts            # Servidor Express
│       ├── trpc.ts             # Setup tRPC
│       ├── oauth.ts            # Fluxo OAuth
│       ├── env.ts              # Variáveis de ambiente tipadas
│       └── ...
│
├── drizzle/                    # ORM e migrações
│   ├── schema.ts               # Definição das tabelas
│   ├── relations.ts            # Relacionamentos
│   └── migrations/             # Migrações geradas automaticamente
│
├── types/                      # Tipos TypeScript globais
│   └── pluggy.ts               # Tipos da API Pluggy
│
├── shared/                     # Código compartilhado (client/server)
│   ├── types.ts                # Tipos compartilhados
│   └── const.ts                # Constantes compartilhadas
│
├── app.config.ts               # Configuração do Expo
├── drizzle.config.ts           # Configuração do Drizzle
├── tailwind.config.js          # Configuração do Tailwind
├── metro.config.js             # Configuração do Metro bundler
└── package.json
```

---

## Funcionalidades

### Controle de Despesas
- Adicionar, editar e remover despesas mensais
- Categorias disponíveis: Transporte, Alimentação, Moradia, Saúde, Educação, Lazer e Outro
- Campo de parcelamento (ex: "3/12" para a 3ª parcela de 12)
- Navegação por mês (anterior/próximo)
- Persistência local com AsyncStorage

### Dashboard Financeiro
- Exibição de receita total (Salário + Vale + Outros)
- Soma de todas as despesas do mês
- Saldo = Receita − Despesas (verde se positivo, vermelho se negativo)

### Configuração de Receitas
- Definir salário, vale-alimentação e outras entradas mensais
- Configuração independente por mês

### Integração Bancária (Pluggy)
- Conectar contas de bancos brasileiros via widget oficial do Pluggy
- Importar transações automaticamente ao retornar ao app
- Mapeamento automático de categorias bancárias para as categorias do app
- Detecção de duplicatas para evitar importações repetidas
- Suporte a múltiplas contas bancárias
- Sincronização manual e automática (ao colocar o app em foreground)

---

## Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- pnpm 9+
- Expo CLI (`npm install -g expo-cli`)
- MySQL (opcional — o app funciona sem banco para uso local)

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

# 4. (Opcional) Configure o banco de dados
pnpm db:push

# 5. Inicie o app em modo desenvolvimento
pnpm dev
```

O comando `pnpm dev` inicia o servidor Express e o Metro bundler em paralelo.

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia servidor + Metro (desenvolvimento) |
| `pnpm dev:server` | Apenas o servidor Express com hot reload |
| `pnpm dev:metro` | Apenas o Metro bundler (Expo) |
| `pnpm android` | Inicia no emulador/dispositivo Android |
| `pnpm ios` | Inicia no simulador iOS |
| `pnpm build` | Compila o servidor para produção (`dist/`) |
| `pnpm start` | Inicia o servidor em modo produção |
| `pnpm check` | Verifica tipos TypeScript sem compilar |
| `pnpm lint` | Executa ESLint |
| `pnpm format` | Formata o código com Prettier |
| `pnpm test` | Executa testes com Vitest |
| `pnpm db:push` | Gera e aplica migrações do banco de dados |
| `pnpm qr` | Gera QR Code para acesso mobile |

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

### Servidor

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | String de conexão MySQL (ex: `mysql://user:pass@host/db`) |
| `JWT_SECRET` | Segredo para assinar tokens de sessão |
| `VITE_APP_ID` | ID do app no Manus OAuth |
| `OAUTH_SERVER_URL` | URL do backend Manus OAuth |
| `VITE_OAUTH_PORTAL_URL` | URL do portal de login Manus |
| `OWNER_OPEN_ID` | OpenID do dono do app (recebe role `admin`) |
| `PLUGGY_CLIENT_ID` | Client ID da conta Pluggy |
| `PLUGGY_CLIENT_SECRET` | Client Secret da conta Pluggy |

### Expo (cliente)

| Variável | Descrição |
|----------|-----------|
| `EXPO_PUBLIC_APP_ID` | ID do app para OAuth no cliente |
| `EXPO_PUBLIC_API_BASE_URL` | URL base da API (ex: `http://localhost:3000`) |
| `EXPO_PUBLIC_OAUTH_PORTAL_URL` | URL do portal de login |

---

## Telas e Navegação

O app usa navegação por abas (bottom tabs) com Expo Router.

### Aba: Despesas (`/`)

Tela principal com:
- Seletor de mês (navegação anterior/próximo)
- Painel de resumo: Receita Total, Total de Despesas, Saldo
- Lista de despesas do mês
- Botão para adicionar nova despesa
- Botão para sincronizar com banco (Pluggy)

### Aba: Configurações (`/settings`)

- Campos para definir Salário, Vale e Outros rendimentos do mês
- Totais calculados em tempo real

### Modal de Despesa

Formulário de criação/edição com campos:
- Nome da despesa
- Categoria (7 opções)
- Valor (R$)
- Parcelas (ex: "2/6")
- Data

---

## API (tRPC)

A API usa tRPC sobre HTTP com serialização via SuperJSON.

**URL base:** `/api/trpc`

### Rotas disponíveis

| Rota | Tipo | Acesso | Descrição |
|------|------|--------|-----------|
| `auth.me` | Query | Público | Retorna o usuário autenticado ou `null` |
| `auth.logout` | Mutation | Público | Limpa o cookie de sessão |
| `system.*` | Vários | Público | Health checks e utilitários |
| `pluggy.createConnectToken` | Mutation | Protegido | Gera token JWT para o widget Pluggy |
| `pluggy.syncTransactions` | Mutation | Protegido | Importa transações do banco conectado |

### Exemplo de uso no cliente

```tsx
import { trpc } from "@/lib/trpc";

// Query
const { data: user } = trpc.auth.me.useQuery();

// Mutation
const syncMutation = trpc.pluggy.syncTransactions.useMutation({
  onSuccess: (transactions) => {
    // merge transactions into local storage
  },
});
```

---

## Integração com o Pluggy

O [Pluggy](https://pluggy.ai) é uma plataforma de open banking que permite conectar contas bancárias brasileiras.

### Fluxo de integração

1. O usuário abre o widget Pluggy (`react-native-pluggy-connect`)
2. O app solicita um Connect Token via `trpc.pluggy.createConnectToken`
3. O usuário autentica no banco de sua escolha dentro do widget
4. Ao fechar o widget, o `itemId` da conta conectada é salvo localmente
5. O app sincroniza transações via `trpc.pluggy.syncTransactions`
6. As transações são mapeadas para categorias do app e mescladas ao storage local

### Mapeamento de categorias

```
Pluggy Category → App Category
─────────────────────────────
FOOD → alimentacao
TRANSPORT → transporte
HOUSING → moradia
HEALTH → saude
EDUCATION → educacao
ENTERTAINMENT → lazer
(outros) → outro
```

### Arquivos relacionados

| Arquivo | Descrição |
|---------|-----------|
| `hooks/use-pluggy.ts` | Hook de estado (connect, sync, disconnect) |
| `lib/pluggy-storage.ts` | Persistência das conexões em AsyncStorage |
| `lib/pluggy-expense-storage.ts` | Merge de transações importadas com despesas locais |
| `lib/pluggy-category-map.ts` | Mapeamento de categorias |
| `server/pluggy.ts` | Wrapper da API REST do Pluggy |
| `server/pluggy-router.ts` | Roteador tRPC para operações bancárias |
| `types/pluggy.ts` | Tipos TypeScript da API Pluggy |

---

## Banco de Dados

O banco de dados é opcional. Sem ele, o app funciona inteiramente com AsyncStorage.

### Schema (`drizzle/schema.ts`)

```typescript
// Tabela de usuários (criada automaticamente pelo OAuth)
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

### Comandos

```bash
# Gerar migração e aplicar no banco
pnpm db:push
```

---

## Autenticação

O app usa **Manus OAuth** para autenticação de usuários.

| Plataforma | Método | Armazenamento do token |
|-----------|--------|----------------------|
| iOS / Android | Bearer token | `expo-secure-store` |
| Web | Cookie HTTP-only | Navegador |

### Hook de autenticação

```tsx
import { useAuth } from "@/hooks/use-auth";

function MyScreen() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  if (loading) return <ActivityIndicator />;
  if (!isAuthenticated) return <LoginButton />;

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

## Armazenamento Local

O app usa AsyncStorage para persistir dados sem necessidade de backend.

| Chave | Conteúdo |
|-------|---------|
| `expenses_data` | JSON com todas as despesas |
| `income_data` | JSON com configuração de receitas por mês |
| `pluggy_connections` | JSON com conexões bancárias ativas |
| `pluggy_last_sync` | ISO string com timestamp da última sincronização |

---

## Tipos e Modelos de Dados

### Despesa (`Expense`)

```typescript
interface Expense {
  id: string;           // UUID gerado localmente
  name: string;         // Nome da despesa
  category: Category;   // Categoria (ver abaixo)
  quantity?: string;    // Parcelamento, ex: "3/10"
  value: number;        // Valor em reais
  date: string;         // ISO 8601, ex: "2024-02-15"
  month: string;        // Formato "YYYY-MM", ex: "2024-02"
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

### Receita mensal (`MonthlyIncome`)

```typescript
interface MonthlyIncome {
  salary: number;   // Salário
  vale: number;     // Vale-alimentação / vale-refeição
  other: number;    // Outras entradas
}
```

---

## Suporte a Plataformas

| Plataforma | Status |
|-----------|--------|
| Android | Suportado (SDK mínimo 24) |
| iOS | Suportado |
| Web | Suportado (via Expo Web + Metro) |
