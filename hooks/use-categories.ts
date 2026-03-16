import { trpc } from '@/lib/trpc';
import { UserCategory } from '@/types/expense';

export function useCategories() {
  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.category.getAll.useQuery();

  const createMut = trpc.category.create.useMutation({
    onSuccess: () => utils.category.getAll.invalidate(),
  });
  const deleteMut = trpc.category.delete.useMutation({
    onSuccess: () => utils.category.getAll.invalidate(),
  });

  const colorMap: Record<string, string> = {};
  const labelMap: Record<string, string> = {};
  const iconMap: Record<string, string> = {};
  for (const cat of categories) {
    colorMap[cat.name] = cat.color;
    labelMap[cat.name] = cat.label;
    iconMap[cat.name] = cat.icon;
  }

  return {
    categories: categories as UserCategory[],
    isLoading,
    colorMap,
    labelMap,
    iconMap,
    createCategory: (data: { name: string; label: string; color: string; icon: string }) =>
      createMut.mutateAsync(data),
    deleteCategory: (id: number) => deleteMut.mutateAsync({ id }),
  };
}
