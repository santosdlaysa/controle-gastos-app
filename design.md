# Design do Aplicativo - Controle de Gastos Mensais

## Visão Geral

Um aplicativo simples e intuitivo para controlar gastos mensais, permitindo que o usuário cadastre despesas por categoria, acompanhe o total gasto e visualize o saldo restante em relação à renda mensal.

## Screens

1. **Home (Despesas do Mês)** - Tela principal com lista de despesas e resumo financeiro
2. **Adicionar Despesa** - Modal/tela para cadastrar nova despesa
3. **Editar Despesa** - Modal/tela para editar despesa existente
4. **Configurações de Renda** - Tela para definir salário e outros valores de renda

## Conteúdo e Funcionalidades por Screen

### 1. Home - Despesas do Mês

**Conteúdo:**
- **Cabeçalho com resumo financeiro:**
  - Total de renda mensal (Salário + Vale)
  - Total de despesas
  - Saldo restante (com cor indicativa: verde se positivo, vermelho se negativo)

- **Seletor de mês:** Navegação entre meses (anterior/próximo)

- **Lista de despesas:**
  - Cada item mostra: Nome da despesa, Categoria, Quantidade/Parcelas, Valor
  - Cores diferentes para categorias (ex: Transporte em azul, Alimentação em verde)
  - Itens podem ser deslizados para deletar ou editados ao toque

- **Botão flutuante:** "+" para adicionar nova despesa

**Funcionalidades:**
- Visualizar todas as despesas do mês
- Filtrar por categoria (opcional)
- Deletar despesa (swipe ou menu)
- Editar despesa (toque no item)
- Navegar entre meses

### 2. Adicionar Despesa (Modal)

**Conteúdo:**
- Campo de texto: Nome da despesa
- Dropdown: Categoria (Transporte, Alimentação, Moradia, Saúde, Educação, Lazer, Outros)
- Campo numérico: Valor previsto
- Campo de texto: Quantidade/Parcelas (opcional, ex: "5/10" significa 5ª parcela de 10)
- Botão: Salvar
- Botão: Cancelar

**Funcionalidades:**
- Validar campos obrigatórios
- Salvar despesa no armazenamento local
- Fechar modal após salvar

### 3. Editar Despesa (Modal)

**Conteúdo:**
- Mesmos campos da tela "Adicionar Despesa", pré-preenchidos
- Botão: Atualizar
- Botão: Cancelar
- Botão: Deletar (com confirmação)

**Funcionalidades:**
- Atualizar despesa existente
- Deletar com confirmação
- Fechar modal após ação

### 4. Configurações de Renda (Tela)

**Conteúdo:**
- Campo numérico: Salário mensal
- Campo numérico: Vale mensal
- Campo numérico: Outros valores de renda (opcional)
- Botão: Salvar

**Funcionalidades:**
- Definir/editar valores de renda
- Calcular total de renda automaticamente
- Persistir dados no armazenamento local

## Fluxos de Usuário Principais

### Fluxo 1: Visualizar Despesas
1. Usuário abre o app → Home é exibida
2. Vê resumo financeiro no topo
3. Vê lista de despesas do mês atual
4. Pode navegar para outros meses

### Fluxo 2: Adicionar Despesa
1. Usuário toca no botão "+"
2. Modal "Adicionar Despesa" abre
3. Preenche os campos (nome, categoria, valor, etc.)
4. Toca "Salvar"
5. Despesa é adicionada à lista
6. Modal fecha e Home é atualizada

### Fluxo 3: Editar Despesa
1. Usuário toca em uma despesa na lista
2. Modal "Editar Despesa" abre com dados pré-preenchidos
3. Modifica os campos desejados
4. Toca "Atualizar"
5. Despesa é atualizada na lista
6. Modal fecha e Home é atualizada

### Fluxo 4: Deletar Despesa
1. Usuário desliza um item para a esquerda (swipe)
2. Botão "Deletar" aparece
3. Toca "Deletar" ou toca no item e depois "Deletar"
4. Confirmação é pedida
5. Despesa é removida da lista
6. Home é atualizada

### Fluxo 5: Configurar Renda
1. Usuário acessa "Configurações" ou menu
2. Toca em "Configurar Renda"
3. Preenche valores de salário e vale
4. Toca "Salvar"
5. Valores são persistidos
6. Home é atualizada com novo total de renda

## Paleta de Cores

- **Primária:** `#0a7ea4` (azul, para botões e destaques)
- **Fundo:** `#ffffff` (branco em modo claro), `#151718` (escuro em modo escuro)
- **Texto Principal:** `#11181C` (cinza escuro em modo claro), `#ECEDEE` (cinza claro em modo escuro)
- **Texto Secundário:** `#687076` (cinza médio)
- **Sucesso:** `#22C55E` (verde, para saldo positivo)
- **Erro:** `#EF4444` (vermelho, para saldo negativo)
- **Categorias:**
  - Transporte: `#3B82F6` (azul)
  - Alimentação: `#10B981` (verde)
  - Moradia: `#F59E0B` (âmbar)
  - Saúde: `#EC4899` (rosa)
  - Educação: `#8B5CF6` (roxo)
  - Lazer: `#06B6D4` (ciano)
  - Outros: `#6B7280` (cinza)

## Considerações de Design

- **Layout:** Portrait (9:16), otimizado para uso com uma mão
- **Tipografia:** Títulos em 24px bold, corpo em 16px regular
- **Espaçamento:** Padding de 16px nas laterais, 12px entre elementos
- **Componentes:** Botões arredondados (border-radius 8px), cards com sombra leve
- **Acessibilidade:** Contraste suficiente, toque mínimo de 44x44px para botões
- **Feedback:** Animações suaves ao adicionar/deletar itens, haptic feedback em ações importantes
