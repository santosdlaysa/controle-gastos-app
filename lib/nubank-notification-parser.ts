import type { ExpenseCategory } from '@/types/expense';

export interface ParsedNubankNotification {
  value: number;
  merchant: string;
  category: ExpenseCategory;
}

const CATEGORY_KEYWORDS: Record<string, ExpenseCategory> = {
  // Alimentação
  restaurante: 'alimentacao',
  lanchonete: 'alimentacao',
  padaria: 'alimentacao',
  supermercado: 'alimentacao',
  mercado: 'alimentacao',
  ifood: 'alimentacao',
  rappi: 'alimentacao',
  pizzaria: 'alimentacao',
  burger: 'alimentacao',
  mcdonald: 'alimentacao',
  'burger king': 'alimentacao',
  subway: 'alimentacao',
  starbucks: 'alimentacao',
  açougue: 'alimentacao',
  hortifruti: 'alimentacao',
  feira: 'alimentacao',
  // Transporte
  uber: 'transporte',
  '99': 'transporte',
  cabify: 'transporte',
  posto: 'transporte',
  combustivel: 'transporte',
  gasolina: 'transporte',
  estacionamento: 'transporte',
  pedagio: 'transporte',
  metro: 'transporte',
  onibus: 'transporte',
  // Saúde
  farmacia: 'saude',
  drogaria: 'saude',
  hospital: 'saude',
  clinica: 'saude',
  laboratorio: 'saude',
  medico: 'saude',
  dentista: 'saude',
  // Educação
  livraria: 'educacao',
  escola: 'educacao',
  faculdade: 'educacao',
  curso: 'educacao',
  udemy: 'educacao',
  // Lazer
  cinema: 'lazer',
  teatro: 'lazer',
  netflix: 'lazer',
  spotify: 'lazer',
  disney: 'lazer',
  amazon: 'lazer',
  steam: 'lazer',
  playstation: 'lazer',
  xbox: 'lazer',
  ingresso: 'lazer',
  // Moradia
  energia: 'moradia',
  agua: 'moradia',
  gas: 'moradia',
  internet: 'moradia',
  aluguel: 'moradia',
  condominio: 'moradia',
};

function guessCategory(merchant: string): ExpenseCategory {
  const lower = merchant.toLowerCase();
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }
  return 'outro';
}

/**
 * Extrai o valor R$ de uma string no formato brasileiro.
 * Suporta: R$ 25,90 / R$ 1.234,56 / R$25,90
 */
function extractValue(text: string): number | null {
  const match = text.match(/R\$\s?([\d.]+,\d{2})/);
  if (!match) return null;

  // Converte formato BR (1.234,56) → número (1234.56)
  const raw = match[1];
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const value = parseFloat(normalized);
  return isNaN(value) ? null : value;
}

/**
 * Extrai o nome do estabelecimento da notificação.
 * Padrões:
 *   "... em NOME DO ESTABELECIMENTO"
 *   Multiline: última linha é o nome
 */
function extractMerchant(text: string): string | null {
  // Tenta padrão "em NOME"
  const emMatch = text.match(/\bem\s+(.+?)(?:\s*$|\s*\.)/i);
  if (emMatch) {
    return emMatch[1].trim();
  }

  // Multiline: tenta pegar a última linha não-vazia
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length >= 3) {
    // Última linha geralmente é o estabelecimento em notificações multiline
    const lastLine = lines[lines.length - 1];
    // Verifica que não é apenas um valor R$
    if (!lastLine.match(/^R\$/)) {
      return lastLine;
    }
  }

  return null;
}

/**
 * Verifica se a notificação é de uma compra (não Pix, transferência, etc.)
 */
function isPurchaseNotification(title: string, text: string): boolean {
  const combined = `${title} ${text}`.toLowerCase();

  // Deve conter "compra"
  if (!combined.includes('compra')) return false;

  // Filtra Pix e transferências
  const excludePatterns = ['pix', 'transferência', 'transferencia', 'ted', 'doc', 'boleto'];
  for (const pattern of excludePatterns) {
    if (combined.includes(pattern)) return false;
  }

  return true;
}

/**
 * Parseia uma notificação do Nubank e extrai dados de compra.
 * Retorna null se a notificação não for de compra ou não puder ser parseada.
 */
export function parseNubankNotification(
  title: string,
  text: string,
  bigText?: string
): ParsedNubankNotification | null {
  // Usa bigText se disponível (mais detalhes), senão text
  const fullText = bigText || text;
  const combinedText = `${title} ${fullText}`;

  // Verifica se é notificação de compra
  if (!isPurchaseNotification(title, fullText)) {
    return null;
  }

  // Extrai valor
  const value = extractValue(combinedText);
  if (!value || value <= 0) {
    return null;
  }

  // Extrai estabelecimento
  const merchant = extractMerchant(combinedText) || 'Compra Nubank';

  // Adivinha categoria
  const category = guessCategory(merchant);

  return { value, merchant, category };
}
