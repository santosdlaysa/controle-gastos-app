import { relations } from "drizzle-orm";
import { users, expenses, incomes, budgets, categoryBudgets } from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  expenses: many(expenses),
  income: one(incomes, { fields: [users.id], references: [incomes.userId] }),
  budgets: many(budgets),
  categoryBudgets: many(categoryBudgets),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, { fields: [incomes.userId], references: [users.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, { fields: [budgets.userId], references: [users.id] }),
}));

export const categoryBudgetsRelations = relations(categoryBudgets, ({ one }) => ({
  user: one(users, { fields: [categoryBudgets.userId], references: [users.id] }),
}));
