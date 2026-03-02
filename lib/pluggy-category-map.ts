import type { ExpenseCategory } from '@/types/expense';

const PLUGGY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  // Inglês
  'food and groceries': 'alimentacao',
  'food': 'alimentacao',
  'groceries': 'alimentacao',
  'restaurants': 'alimentacao',
  'eating out': 'alimentacao',
  'transportation': 'transporte',
  'transport': 'transporte',
  'travel': 'transporte',
  'gas': 'transporte',
  'health': 'saude',
  'health and fitness': 'saude',
  'pharmacy': 'saude',
  'education': 'educacao',
  'entertainment': 'lazer',
  'recreation': 'lazer',
  'streaming': 'lazer',
  'housing': 'moradia',
  'rent': 'moradia',
  'utilities': 'moradia',
  'home': 'moradia',
  // Português
  'alimentação': 'alimentacao',
  'supermercado': 'alimentacao',
  'restaurante': 'alimentacao',
  'transporte': 'transporte',
  'saúde': 'saude',
  'educação': 'educacao',
  'lazer': 'lazer',
  'moradia': 'moradia',
};

export function mapPluggyCategory(pluggyCategory: string | null): ExpenseCategory {
  if (!pluggyCategory) return 'outro';
  const lower = pluggyCategory.toLowerCase().trim();

  // Match exato
  if (PLUGGY_CATEGORY_MAP[lower]) return PLUGGY_CATEGORY_MAP[lower];

  // Match por substring
  for (const [key, category] of Object.entries(PLUGGY_CATEGORY_MAP)) {
    if (lower.includes(key)) return category;
  }

  return 'outro';
}
