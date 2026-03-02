import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import type { MonthlyData, Income } from "@/types/expense";

const STORAGE_KEY = "expenses_data";
const INCOME_KEY = "income_settings";
const MIGRATION_DONE_KEY = "backend_migration_completed";

export type MigrationState =
  | "idle"
  | "checking"
  | "needed"
  | "in_progress"
  | "done"
  | "error";

export function useMigration() {
  const [state, setState] = useState<MigrationState>("idle");
  const [error, setError] = useState<string | null>(null);

  const statusQuery = trpc.migration.status.useQuery(undefined, {
    enabled: false, // only fetch on demand
  });
  const importMut = trpc.migration.importAll.useMutation();

  const checkAndMigrate = useCallback(async () => {
    setState("checking");
    setError(null);

    try {
      // Check if migration already completed locally
      const doneFlagRaw = await AsyncStorage.getItem(MIGRATION_DONE_KEY);
      if (doneFlagRaw === "true") {
        setState("done");
        return;
      }

      // Check if there's local data to migrate
      const localDataRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!localDataRaw) {
        // No local data — mark done and proceed
        await AsyncStorage.setItem(MIGRATION_DONE_KEY, "true");
        setState("done");
        return;
      }

      // Check server status
      const serverStatus = await statusQuery.refetch();
      if (serverStatus.data?.hasMigrated) {
        // Server already has data — mark migration done
        await AsyncStorage.setItem(MIGRATION_DONE_KEY, "true");
        setState("done");
        return;
      }

      // Migration is needed
      setState("needed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao verificar migração");
      setState("error");
    }
  }, [statusQuery]);

  const runMigration = useCallback(async () => {
    setState("in_progress");
    setError(null);

    try {
      const [localDataRaw, incomeRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(INCOME_KEY),
      ]);

      const months: Record<string, MonthlyData> = localDataRaw
        ? JSON.parse(localDataRaw)
        : {};

      const income: Income | null = incomeRaw ? JSON.parse(incomeRaw) : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await importMut.mutateAsync({ income, months: months as any });

      await AsyncStorage.setItem(MIGRATION_DONE_KEY, "true");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro durante a migração");
      setState("error");
    }
  }, [importMut]);

  // Auto-check on mount
  useEffect(() => {
    checkAndMigrate();
  }, [checkAndMigrate]);

  return {
    state,
    error,
    isNeeded: state === "needed",
    isInProgress: state === "in_progress" || state === "checking",
    isDone: state === "done",
    runMigration,
    retry: checkAndMigrate,
  };
}
