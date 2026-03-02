/** Parse "current/total" quantity string */
export function parseQuantity(quantity: string | null | undefined): {
  installmentCurrent: number;
  installmentTotal: number;
} | null {
  if (!quantity) return null;
  const match = quantity.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const current = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  if (isNaN(current) || isNaN(total)) return null;
  return { installmentCurrent: current, installmentTotal: total };
}

/** Derive expense source from clientId prefix */
export function detectSource(clientId: string | null | undefined): "manual" | "pluggy" | "nubank" {
  if (!clientId) return "manual";
  if (clientId.startsWith("pluggy_")) return "pluggy";
  if (clientId.startsWith("nubank_")) return "nubank";
  return "manual";
}

/** Get next month string in "YYYY-MM" format */
export function getNextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map((v) => parseInt(v, 10));
  const date = new Date(year, month - 1 + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
