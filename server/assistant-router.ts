import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { getExpensesByMonth, getIncome, getBudget } from "./expense-db";

const CATEGORY_LABELS: Record<string, string> = {
  transporte: "Transporte",
  alimentacao: "Alimentação",
  moradia: "Moradia",
  saude: "Saúde",
  educacao: "Educação",
  lazer: "Lazer",
  outro: "Outro",
};

export const assistantRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [expenseRows, income, budgetRow] = await Promise.all([
        getExpensesByMonth(ctx.user.id, input.month),
        getIncome(ctx.user.id),
        getBudget(ctx.user.id, input.month),
      ]);

      const totalIncome = income
        ? parseFloat(income.salary ?? "0") +
          parseFloat(income.vale ?? "0") +
          parseFloat(income.other ?? "0")
        : 0;

      const totalExpenses = expenseRows.reduce((sum, e) => sum + parseFloat(e.value), 0);
      const budget = budgetRow ? parseFloat(budgetRow.totalBudget ?? "0") : 0;

      const categoryTotals: Record<string, number> = {};
      for (const expense of expenseRows) {
        categoryTotals[expense.category] =
          (categoryTotals[expense.category] ?? 0) + parseFloat(expense.value);
      }

      const categorySummary = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, total]) => `  - ${CATEGORY_LABELS[cat] ?? cat}: R$ ${total.toFixed(2)}`)
        .join("\n");

      const monthLabel = new Date(`${input.month}-15`).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      const balance = totalIncome - totalExpenses;
      const budgetUsage = budget > 0 ? ((totalExpenses / budget) * 100).toFixed(1) : null;

      const systemPrompt = [
        `Você é um assistente financeiro pessoal do aplicativo "Controle de Gastos".`,
        `Ajude o usuário a entender suas finanças, identificar padrões de gastos e tomar melhores decisões financeiras.`,
        `Seja amigável, direto e prático. Use emojis com moderação. Responda sempre em português brasileiro.\n`,
        `📅 Dados financeiros de ${monthLabel}:`,
        `- Renda total: R$ ${totalIncome.toFixed(2)}`,
        income
          ? `  (Salário: R$ ${parseFloat(income.salary ?? "0").toFixed(2)} | Vale: R$ ${parseFloat(income.vale ?? "0").toFixed(2)} | Outros: R$ ${parseFloat(income.other ?? "0").toFixed(2)})`
          : `  (sem renda cadastrada)`,
        `- Despesas do mês: R$ ${totalExpenses.toFixed(2)}`,
        `- Saldo: R$ ${balance.toFixed(2)} (${balance >= 0 ? "positivo ✅" : "negativo ⚠️"})`,
        budget > 0 ? `- Orçamento: R$ ${budget.toFixed(2)} (${budgetUsage}% utilizado)` : null,
        categorySummary
          ? `\n💸 Despesas por categoria:\n${categorySummary}`
          : `\nNenhuma despesa registrada este mês.`,
        `\nTotal de lançamentos: ${expenseRows.length}`,
      ]
        .filter(Boolean)
        .join("\n");

      const result = await invokeLLM({
        messages: [{ role: "system", content: systemPrompt }, ...input.messages],
      });

      const rawContent = result.choices[0]?.message?.content ?? "";
      const text =
        typeof rawContent === "string"
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent
                .filter((p) => p.type === "text")
                .map((p) => (p as { type: "text"; text: string }).text)
                .join("")
            : "";

      return { message: text };
    }),
});
