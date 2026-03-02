import { ENV } from './_core/env';

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

// Cache do apiKey (válido 2h, renovamos com 5min de margem)
let cachedApiKey: string | null = null;
let cachedApiKeyExpiry = 0;

// --- AUTH ---
export async function getPluggyApiKey(): Promise<string> {
  const now = Date.now();
  if (cachedApiKey && cachedApiKeyExpiry > now + 5 * 60 * 1000) {
    return cachedApiKey;
  }

  const res = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: ENV.pluggyClientId,
      clientSecret: ENV.pluggyClientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Pluggy auth failed: ${res.status}`);
  const data = await res.json();

  cachedApiKey = data.apiKey;
  cachedApiKeyExpiry = now + 2 * 60 * 60 * 1000; // 2h
  return data.apiKey;
}

// --- CONNECT TOKEN ---
export async function createConnectToken(itemId?: string): Promise<string> {
  const apiKey = await getPluggyApiKey();
  const body: Record<string, unknown> = {};
  if (itemId) body.itemId = itemId;

  const res = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Pluggy connect token failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

// --- Tipos internos ---
interface PluggyAccountRaw {
  id: string;
  name: string;
  type: string;
  subtype: string;
  balance: number;
}

interface PluggyTransactionRaw {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  category: string | null;
  merchant?: { name: string } | null;
}

// --- ACCOUNTS ---
export async function getAccounts(itemId: string): Promise<PluggyAccountRaw[]> {
  const apiKey = await getPluggyApiKey();
  const res = await fetch(
    `${PLUGGY_BASE_URL}/accounts?itemId=${itemId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`Pluggy accounts failed: ${res.status}`);
  const data = await res.json();
  return data.results ?? [];
}

// --- TRANSACTIONS (paginado) ---
export async function getTransactions(
  accountId: string,
  from: string,
  to: string
): Promise<PluggyTransactionRaw[]> {
  const apiKey = await getPluggyApiKey();
  const all: PluggyTransactionRaw[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${PLUGGY_BASE_URL}/transactions?accountId=${accountId}&from=${from}&to=${to}&page=${page}&pageSize=500`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Pluggy transactions failed: ${res.status}`);
    const data = await res.json();
    all.push(...(data.results ?? []));
    totalPages = data.totalPages ?? 1;
    page++;
  } while (page <= totalPages);

  return all;
}
