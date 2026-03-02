// Retornado pelo server no syncTransactions
export interface PluggySyncedExpense {
  pluggyId: string;        // ID da transação no Pluggy (UUID)
  description: string;     // merchant.name || description
  amount: number;          // valor positivo (já filtrado DEBIT)
  date: string;            // ISO date "2026-02-13T10:30:00Z"
  pluggyCategory: string | null; // categoria da Pluggy (EN ou PT)
}

// Salvo no AsyncStorage (pluggy_connections)
export interface PluggyConnection {
  itemId: string;          // UUID do item no Pluggy
  connectorName: string;   // "Nubank", "Itaú", etc.
  connectedAt: string;     // ISO date
}
