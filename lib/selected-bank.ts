/**
 * Global selected bank tracker.
 * null means "all banks" (no filter).
 */
let _selectedBank: { id: number; name: string } | null = null;

export function setSelectedBank(bank: { id: number; name: string } | null) {
  _selectedBank = bank;
}

export function getSelectedBank(): { id: number; name: string } | null {
  return _selectedBank;
}
