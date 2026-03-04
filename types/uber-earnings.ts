export type UberEntryType = 'ganho' | 'gasto';

// ─── Categorias de GANHO ───────────────────────────────────────────────────────

export type UberEarningCategory =
  | 'corrida'
  | 'uber_eats'
  | 'bonus'
  | 'outro_ganho';

export const UBER_EARNING_CATEGORIES: UberEarningCategory[] = [
  'corrida',
  'uber_eats',
  'bonus',
  'outro_ganho',
];

export const UBER_EARNING_CATEGORY_COLORS: Record<UberEarningCategory, string> = {
  corrida: '#10B981',
  uber_eats: '#F59E0B',
  bonus: '#8B5CF6',
  outro_ganho: '#6B7280',
};

export const UBER_EARNING_CATEGORY_LABELS: Record<UberEarningCategory, string> = {
  corrida: 'Corrida',
  uber_eats: 'Uber Eats',
  bonus: 'Bônus',
  outro_ganho: 'Outro',
};

// ─── Categorias de GASTO ──────────────────────────────────────────────────────

export type UberExpenseCategory =
  | 'combustivel'
  | 'manutencao'
  | 'pedagio'
  | 'lavagem'
  | 'seguro'
  | 'outro_gasto';

export const UBER_EXPENSE_CATEGORIES: UberExpenseCategory[] = [
  'combustivel',
  'manutencao',
  'pedagio',
  'lavagem',
  'seguro',
  'outro_gasto',
];

export const UBER_EXPENSE_CATEGORY_COLORS: Record<UberExpenseCategory, string> = {
  combustivel: '#EF4444',
  manutencao: '#F97316',
  pedagio: '#EAB308',
  lavagem: '#3B82F6',
  seguro: '#EC4899',
  outro_gasto: '#6B7280',
};

export const UBER_EXPENSE_CATEGORY_LABELS: Record<UberExpenseCategory, string> = {
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  pedagio: 'Pedágio',
  lavagem: 'Lavagem',
  seguro: 'Seguro',
  outro_gasto: 'Outro',
};

// ─── Tipo unificado de entrada ────────────────────────────────────────────────

export type UberCategory = UberEarningCategory | UberExpenseCategory;

export const ALL_UBER_CATEGORIES = [
  ...UBER_EARNING_CATEGORIES,
  ...UBER_EXPENSE_CATEGORIES,
] as UberCategory[];

export function getCategoryColor(category: UberCategory): string {
  return (
    (UBER_EARNING_CATEGORY_COLORS as Record<string, string>)[category] ||
    (UBER_EXPENSE_CATEGORY_COLORS as Record<string, string>)[category] ||
    '#6B7280'
  );
}

export function getCategoryLabel(category: UberCategory): string {
  return (
    (UBER_EARNING_CATEGORY_LABELS as Record<string, string>)[category] ||
    (UBER_EXPENSE_CATEGORY_LABELS as Record<string, string>)[category] ||
    category
  );
}

// ─── Interface principal ──────────────────────────────────────────────────────

export interface UberEntry {
  id: string;
  description: string;
  category: UberCategory;
  entryType: UberEntryType;
  value: number;
  date: string;
  month: string;
}

// Aliases para compatibilidade com código existente
export type UberEarning = UberEntry;

// Retrocompat: constantes antigas
export const UBER_CATEGORY_COLORS = UBER_EARNING_CATEGORY_COLORS as Record<string, string>;
export const UBER_CATEGORY_LABELS = UBER_EARNING_CATEGORY_LABELS as Record<string, string>;
export const UBER_EARNING_CATEGORIES_COMPAT = UBER_EARNING_CATEGORIES;
