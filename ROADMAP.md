# Roadmap — Controle de Gastos App

## Visão geral do app atual

**Fluxo principal:** a tela Home (`app/(tabs)/index.tsx`) mostra o resumo financeiro do mês (renda total, despesas, saldo) e a lista de despesas com categorias, quantidade/parcelas, valor e marcação de pago.

**Persistência:** o hook `useExpenses` (`hooks/use-expenses.ts`) salva renda e despesas por mês no AsyncStorage com a estrutura `MonthlyData` (incomes + expenses mês a mês).

**Cadastro/edição:** o modal `ExpenseModal` permite criar/editar despesas com nome, categoria, quantidade/parcelas e valor, além de enviar a próxima parcela para o mês seguinte.

**Renda:** a tela `SettingsScreen` (`app/(tabs)/settings.tsx`) configura salário, vale e outros rendimentos, calculando a renda total.

---

## Objetivos de melhoria

- Enriquecer o app para planejamento financeiro, não apenas registro de gastos pontuais.
- Melhorar visualização e entendimento dos dados (gráficos, comparações, destaques).
- Facilitar disciplina e hábito com metas, alertas e lembretes.
- Preparar terreno para integrações futuras (bancos, Pluggy, sync).

---

## Funcionalidades planejadas

### 1. Visão mais rica do mês atual

**Resumo por categoria**
- Exibir, abaixo das cartas principais, uma lista ou gráfico simples com o total gasto por categoria (Alimentação, Transporte, etc.).
- Permitir tocar em uma categoria para filtrar a lista de despesas.

**Indicadores rápidos**
- Percentual da renda já comprometida (% das despesas sobre a renda).
- Quantidade de despesas ainda não pagas no mês e valor total pendente.

---

### 2. Relatórios e histórico

**Comparação entre meses**
- Tela de histórico com lista dos últimos meses mostrando: renda, total de despesas e saldo em cada um.
- Destaque visual de meses em que o saldo foi negativo ou muito baixo.

**Gráfico de linha ou barras**
- Pequeno gráfico (mesmo simplificado) mostrando evolução do total de despesas e saldo nos últimos 6–12 meses.

---

### 3. Metas e orçamentos

**Meta de gasto mensal**
- Campo para definir um orçamento global de despesas para o mês (ex.: R$ 2.000,00).
- Barra de progresso mostrando o quanto da meta já foi utilizado.

**Orçamento por categoria** *(fase 2)*
- Permitir definir limite por categoria (ex.: Alimentação até R$ 800,00).
- Avisar visualmente quando uma categoria estiver perto ou estourando a meta (cores de alerta).

---

### 4. Melhorias em despesas parceladas e recorrentes

**Cadastro de recorrência**
- Na modal de despesa, opção de marcar como "recorrente" (mensal) sem fim ou por X meses.
- Gerar automaticamente as próximas ocorrências em cada mês, sem precisar enviar manualmente.

**Resumo de parcelas**
- Campo que mostra claramente: "Parcela 3 de 10" + valor total do contrato (10 × R$ 200 = R$ 2.000).

---

### 5. Alertas e lembretes

**Notificações locais**
- Lembrete no início do mês para revisar despesas fixas.
- Lembrete alguns dias antes do vencimento de grandes despesas (via campo opcional de "dia de vencimento").

**Alertas dentro do app**
- Banner simples na Home avisando: "Você já usou 80% do seu orçamento deste mês".

---

### 6. Experiência de uso (UX/UI)

**Onboarding inicial**
- Pequenas telas ou tooltips explicando os principais recursos: cadastrar renda, adicionar despesas, marcar como paga, usar parcelas.

**Melhorias visuais na lista**
- Agrupar despesas por dia ou tipo (fixas x variáveis) com divisores ou cabeçalhos.
- Mostrar ícones por categoria (carro para transporte, casa para moradia, etc.).

**Busca e filtros**
- Campo de busca pelo nome da despesa.
- Filtros rápidos: "Somente não pagas", "Por categoria", "Somente parcelas".

---

### 7. Exportação e backup

**Exportar dados**
- Exportar todas as despesas de um mês (ou período) para CSV/JSON e compartilhar (WhatsApp, e-mail, etc.).

**Backup / Restauração** *(futuro)*
- Guardar backup simples em arquivo local (ou em nuvem) e permitir restaurar.

---

### 8. Integrações futuras

**Integração com notificações de banco / Nubank**
- Aproveitar partes já existentes (`use-nubank-listener`, parsers) para sugerir despesas automaticamente com base em notificações.

**Integração com Pluggy**
- Sincronizar transações reais da conta/cartão e sugerir lançamentos no app de controle.

---

## Ordem de implementação sugerida

| # | Funcionalidade |
|---|----------------|
| 1 | Melhorias de visualização do mês (resumo por categoria, indicadores rápidos, filtros simples) |
| 2 | Metas e orçamentos (meta mensal + barra de progresso, depois por categoria) |
| 3 | Relatórios/histórico (lista de meses + gráfico simples) |
| 4 | Recorrências automáticas (marcar despesa como recorrente e gerar meses futuros) |
| 5 | Alertas e notificações (banners internos + notificações locais básicas) |
| 6 | Exportação de dados (CSV/JSON) e backup/restauração |
| 7 | Integrações bancárias/Pluggy |
