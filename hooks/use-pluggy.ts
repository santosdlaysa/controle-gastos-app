import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { trpc } from '@/lib/trpc';
import type { PluggyConnection } from '@/types/pluggy';
import {
  isPluggyEnabled, setPluggyEnabled as storePluggyEnabled,
  getPluggyConnections, addPluggyConnection, removePluggyConnection,
  getLastSyncTime, setLastSyncTime,
} from '@/lib/pluggy-storage';
import { mergePluggyExpenses } from '@/lib/pluggy-expense-storage';

export function usePluggy() {
  const [enabled, setEnabled] = useState(false);
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{added: number; skipped: number} | null>(null);
  const [showWidget, setShowWidget] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);

  const createTokenMut = trpc.pluggy.createConnectToken.useMutation();
  const syncMut = trpc.pluggy.syncTransactions.useMutation();

  // Load saved state
  useEffect(() => {
    isPluggyEnabled().then(setEnabled);
    getPluggyConnections().then(setConnections);
    getLastSyncTime().then(setLastSync);
  }, []);

  const toggleEnabled = useCallback(async (value: boolean) => {
    await storePluggyEnabled(value);
    setEnabled(value);
  }, []);

  // Open widget
  const openConnect = useCallback(async () => {
    const result = await createTokenMut.mutateAsync({});
    setConnectToken(result.accessToken);
    setShowWidget(true);
  }, [createTokenMut]);

  // Widget success callback
  const handleConnectSuccess = useCallback(async (data: {
    item: { id: string; connector?: { name: string } }
  }) => {
    const conn: PluggyConnection = {
      itemId: data.item.id,
      connectorName: data.item.connector?.name || 'Banco',
      connectedAt: new Date().toISOString(),
    };
    await addPluggyConnection(conn);
    setConnections(prev => [...prev, conn]);
    setShowWidget(false);
  }, []);

  // Sync all connections
  const syncAll = useCallback(async () => {
    if (syncing || connections.length === 0) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const to = now.toISOString().split('T')[0];

      let totalAdded = 0, totalSkipped = 0;

      for (const conn of connections) {
        const result = await syncMut.mutateAsync({
          itemId: conn.itemId, from, to,
        });
        const merged = await mergePluggyExpenses(result.expenses);
        totalAdded += merged.added;
        totalSkipped += merged.skipped;
      }

      const syncTime = new Date().toISOString();
      await setLastSyncTime(syncTime);
      setLastSync(syncTime);
      setSyncResult({ added: totalAdded, skipped: totalSkipped });
    } catch (error) {
      console.error('Pluggy sync error:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing, connections, syncMut]);

  // Disconnect a bank
  const disconnect = useCallback(async (itemId: string) => {
    await removePluggyConnection(itemId);
    setConnections(prev => prev.filter(c => c.itemId !== itemId));
  }, []);

  // Auto-sync on foreground
  useEffect(() => {
    if (!enabled || connections.length === 0) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncAll();
    });
    return () => sub.remove();
  }, [enabled, connections.length, syncAll]);

  return {
    enabled, toggleEnabled,
    connections, disconnect,
    syncing, lastSync, syncResult,
    showWidget, connectToken,
    openConnect, handleConnectSuccess,
    handleConnectClose: useCallback(() => setShowWidget(false), []),
    syncAll,
  };
}
