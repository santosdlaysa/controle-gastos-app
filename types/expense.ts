export type ExpenseCategory = string;

export interface UserCategory {
  id: number;
  name: string;
  label: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  quantity?: string; // e.g., "5/10" for 5th payment of 10
  value: number;
  date: string; // ISO date string
  month: string; // YYYY-MM format
  /**
   * Indica se a despesa já foi paga.
   * Opcional para manter compatibilidade com dados antigos.
   */
  paid?: boolean;
  /** Banco ou cartão associado (ex: "Nubank", "Bradesco") */
  bank?: string | null;
  /** Tipo de pagamento: débito ou crédito */
  paymentType?: "debit" | "credit" | null;
  /** Despesa fixa ou variável */
  expenseType?: 'fixed' | 'variable' | null;
  /** ID do devedor vinculado (opcional) */
  debtorId?: number | null;
  /** Nome do devedor vinculado (preenchido na leitura) */
  debtorName?: string | null;
}

export interface Income {
  salary: number;
  vale: number;
  other: number;
}

export type CategoryBudgets = Record<string, number>;

export interface MonthlyData {
  month: string; // YYYY-MM format
  expenses: Expense[];
  income?: Income; // kept for backward compat, prefer global income_settings
  /**
   * Orçamento total de despesas para o mês (opcional).
   */
  budget?: number;
  /**
   * Orçamentos por categoria para o mês (opcional).
   */
  categoryBudgets?: CategoryBudgets;
}

export const CATEGORY_COLORS: Record<string, string> = {
  transporte: '#3B82F6',
  alimentacao: '#10B981',
  moradia: '#F59E0B',
  saude: '#EC4899',
  educacao: '#8B5CF6',
  lazer: '#06B6D4',
  outro: '#6B7280',
};

export const CATEGORY_LABELS: Record<string, string> = {
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  moradia: 'Moradia',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  outro: 'Outro',
};
