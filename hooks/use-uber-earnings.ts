import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { UberEntry, UberCategory, UberEntryType } from "@/types/uber-earnings";

function toUberEntry(row: {
  id: number;
  description: string;
  category: string;
  entryType: string;
  value: string;
  date: string;
  month: string;
}): UberEntry {
  return {
    id: row.id.toString(),
    description: row.description,
    category: row.category as UberCategory,
    entryType: (row.entryType ?? "ganho") as UberEntryType,
    value: parseFloat(row.value),
    date: row.date,
    month: row.month,
  };
}

export function useUberEarnings(month: string) {
  const utils = trpc.useUtils();

  const entriesQuery = trpc.uberEarnings.getByMonth.useQuery({ month });

  const loading = entriesQuery.isLoading;

  const entries: UberEntry[] = useMemo(
    () => (entriesQuery.data ?? []).map(toUberEntry),
    [entriesQuery.data],
  );

  const invalidate = () => utils.uberEarnings.getByMonth.invalidate({ month });

  const createMut = trpc.uberEarnings.create.useMutation({ onSuccess: invalidate });
  const updateMut = trpc.uberEarnings.update.useMutation({ onSuccess: invalidate });
  const deleteMut = trpc.uberEarnings.delete.useMutation({ onSuccess: invalidate });

  const addEntry = async (entry: Omit<UberEntry, "id" | "date" | "month">) => {
    await createMut.mutateAsync({
      description: entry.description,
      category: entry.category,
      entryType: entry.entryType,
      value: entry.value,
      date: new Date().toISOString(),
      month,
    });
  };

  const updateEntry = async (
    id: string,
    updates: Partial<Omit<UberEntry, "id" | "date" | "month">>,
  ) => {
    await updateMut.mutateAsync({
      id: parseInt(id, 10),
      description: updates.description,
      category: updates.category,
      entryType: updates.entryType,
      value: updates.value,
    });
  };

  const deleteEntry = async (id: string) => {
    await deleteMut.mutateAsync({ id: parseInt(id, 10) });
  };

  const reload = () => {
    utils.uberEarnings.getByMonth.invalidate({ month });
  };

  const earnings = entries.filter((e) => e.entryType === "ganho");
  const expenses = entries.filter((e) => e.entryType === "gasto");
  const totalEarnings = earnings.reduce((sum, e) => sum + e.value, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const netBalance = totalEarnings - totalExpenses;

  return {
    entries,
    earnings,
    expenses,
    loading,
    totalEarnings,
    totalExpenses,
    netBalance,
    // aliases antigos
    addEarning: addEntry,
    updateEarning: updateEntry,
    deleteEarning: deleteEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    reload,
  };
}
