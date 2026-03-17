import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

// ─── Banks ────────────────────────────────────────────────────────────────────

export const banks = pgTable(
  "banks",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    isCredit: boolean("isCredit").default(false).notNull(),
    creditLimit: numeric("creditLimit", { precision: 10, scale: 2 }),
    debitBalance: numeric("debitBalance", { precision: 10, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("banks_user_name_idx").on(t.userId, t.name)],
);

export type DbBank = typeof banks.$inferSelect;
export type InsertBank = typeof banks.$inferInsert;

// ─── Uber Earning categories ──────────────────────────────────────────────────

export const UBER_EARNING_CATEGORIES = [
  "corrida",
  "uber_eats",
  "bonus",
  "outro",
] as const;

export type UberEarningCategory = (typeof UBER_EARNING_CATEGORIES)[number];

export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Expense categories ───────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "transporte",
  "alimentacao",
  "moradia",
  "saude",
  "educacao",
  "lazer",
  "outro",
] as const;

export type ExpenseCategory = string;

export const expenseCategoryEnum = pgEnum("expense_category", EXPENSE_CATEGORIES);
export const expenseSourceEnum = pgEnum("expense_source", ["manual", "pluggy", "nubank"]);
export const expensePaymentTypeEnum = pgEnum("expense_payment_type", ["debit", "credit"]);
export const expenseTypeEnum = pgEnum("expense_type", ["fixed", "variable"]);

// ─── user_categories ──────────────────────────────────────────────────────────

export const userCategories = pgTable(
  "user_categories",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }).notNull().default('#6B7280'),
    icon: varchar("icon", { length: 50 }).notNull().default('category'),
    isDefault: boolean("isDefault").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("user_categories_user_name_idx").on(t.userId, t.name)],
);

export type DbUserCategory = typeof userCategories.$inferSelect;
export type InsertUserCategory = typeof userCategories.$inferInsert;

// ─── expenses ─────────────────────────────────────────────────────────────────

export const expenses = pgTable(
  "expenses",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull(),
    clientId: varchar("clientId", { length: 128 }),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    date: varchar("date", { length: 30 }).notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    quantity: varchar("quantity", { length: 20 }),
    paid: boolean("paid").default(false),
    source: expenseSourceEnum("source").default("manual"),
    bank: varchar("bank", { length: 100 }),
    paymentType: expensePaymentTypeEnum("paymentType"),
    expenseType: expenseTypeEnum("expenseType"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("expenses_user_client_idx").on(t.userId, t.clientId)],
);

export type DbExpense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── incomes ──────────────────────────────────────────────────────────────────

export const incomes = pgTable("incomes", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull().unique(),
  salary: numeric("salary", { precision: 10, scale: 2 }).default("0"),
  vale: numeric("vale", { precision: 10, scale: 2 }).default("0"),
  other: numeric("other", { precision: 10, scale: 2 }).default("0"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DbIncome = typeof incomes.$inferSelect;
export type InsertIncome = typeof incomes.$inferInsert;

// ─── budgets ──────────────────────────────────────────────────────────────────

export const budgets = pgTable(
  "budgets",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    totalBudget: numeric("totalBudget", { precision: 10, scale: 2 }).default("0"),
    incomeOverride: numeric("incomeOverride", { precision: 10, scale: 2 }),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("budgets_user_month_idx").on(t.userId, t.month)],
);

export type DbBudget = typeof budgets.$inferSelect;
export type InsertBudget = typeof budgets.$inferInsert;

// ─── category_budgets ─────────────────────────────────────────────────────────

export const categoryBudgets = pgTable(
  "category_budgets",
  {
    id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
    userId: integer("userId").notNull(),
    month: varchar("month", { length: 7 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("cat_budgets_user_month_cat_idx").on(t.userId, t.month, t.category)],
);

export type DbCategoryBudget = typeof categoryBudgets.$inferSelect;
export type InsertCategoryBudget = typeof categoryBudgets.$inferInsert;

// ─── uber_earnings ─────────────────────────────────────────────────────────────

export const uberEarnings = pgTable("uber_earnings", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  userId: integer("userId").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  entryType: varchar("entryType", { length: 10 }).default("ganho"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  date: varchar("date", { length: 30 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DbUberEarning = typeof uberEarnings.$inferSelect;
export type InsertUberEarning = typeof uberEarnings.$inferInsert;

// ─── password_reset_tokens ─────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
