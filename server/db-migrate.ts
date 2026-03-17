import postgres from "postgres";

/**
 * Cria todas as tabelas e tipos do schema se não existirem.
 * Seguro rodar a cada startup — usa IF NOT EXISTS em tudo.
 */
export async function ensureSchema(databaseUrl: string): Promise<void> {
  const sql = postgres(databaseUrl, { ssl: { rejectUnauthorized: false }, onnotice: () => {} });

  try {
    // Enums
    await sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('user', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE expense_category AS ENUM ('transporte', 'alimentacao', 'moradia', 'saude', 'educacao', 'lazer', 'outro');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE expense_source AS ENUM ('manual', 'pluggy', 'nubank');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    // users
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "openId" varchar(64) NOT NULL UNIQUE,
        name text,
        email varchar(320),
        "loginMethod" varchar(64),
        "passwordHash" varchar(255),
        role role NOT NULL DEFAULT 'user',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "lastSignedIn" timestamp NOT NULL DEFAULT now()
      )
    `;

    // Garante coluna passwordHash em tabelas pré-existentes sem ela
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "passwordHash" varchar(255)
    `;

    // expenses
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        "clientId" varchar(128),
        name varchar(255) NOT NULL,
        category expense_category NOT NULL,
        value numeric(10,2) NOT NULL,
        date varchar(30) NOT NULL,
        month varchar(7) NOT NULL,
        quantity varchar(20),
        paid boolean DEFAULT false,
        source expense_source DEFAULT 'manual',
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS expenses_user_client_idx
      ON expenses ("userId", "clientId")
    `;

    // incomes
    await sql`
      CREATE TABLE IF NOT EXISTS incomes (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL UNIQUE,
        salary numeric(10,2) DEFAULT '0',
        vale numeric(10,2) DEFAULT '0',
        other numeric(10,2) DEFAULT '0',
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    // budgets
    await sql`
      CREATE TABLE IF NOT EXISTS budgets (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        month varchar(7) NOT NULL,
        "totalBudget" numeric(10,2) DEFAULT '0',
        "incomeOverride" numeric(10,2),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_month_idx
      ON budgets ("userId", month)
    `;

    // category_budgets
    await sql`
      CREATE TABLE IF NOT EXISTS category_budgets (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        month varchar(7) NOT NULL,
        category expense_category NOT NULL,
        amount numeric(10,2) NOT NULL,
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS cat_budgets_user_month_cat_idx
      ON category_budgets ("userId", month, category)
    `;

    // uber_earnings
    await sql`
      CREATE TABLE IF NOT EXISTS uber_earnings (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        description varchar(255) NOT NULL,
        category varchar(50) NOT NULL,
        "entryType" varchar(10) DEFAULT 'ganho',
        value numeric(10,2) NOT NULL,
        date varchar(30) NOT NULL,
        month varchar(7) NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    // banks
    await sql`
      CREATE TABLE IF NOT EXISTS banks (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        name varchar(100) NOT NULL,
        "creditLimit" numeric(10,2),
        "debitBalance" numeric(10,2),
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS "creditLimit" numeric(10,2)`;
    await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS "debitBalance" numeric(10,2)`;
    await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now()`;
    await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS "isCredit" boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE banks ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0`;
    // Auto-mark banks that have ever had a credit expense
    await sql`
      UPDATE banks b SET "isCredit" = true
      WHERE EXISTS (
        SELECT 1 FROM expenses e
        WHERE e.bank = b.name AND e."userId" = b."userId" AND e."paymentType" = 'credit'
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS banks_user_name_idx
      ON banks ("userId", name)
    `;

    // Garante colunas bank e paymentType em expenses pré-existentes
    await sql`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bank varchar(100)
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE payment_type AS ENUM ('debit', 'credit');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    await sql`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "paymentType" payment_type
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE expense_type AS ENUM ('fixed', 'variable');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;

    await sql`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS "expenseType" expense_type
    `;

    // password_reset_tokens
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        email varchar(320) NOT NULL,
        code varchar(6) NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "usedAt" timestamp,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    // user_categories table
    await sql`
      CREATE TABLE IF NOT EXISTS user_categories (
        id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        "userId" integer NOT NULL,
        name varchar(100) NOT NULL,
        label varchar(100) NOT NULL,
        color varchar(7) NOT NULL DEFAULT '#6B7280',
        icon varchar(50) NOT NULL DEFAULT 'category',
        "isDefault" boolean DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS user_categories_user_name_idx
      ON user_categories ("userId", name)
    `;

    // Migrate expenses.category from enum to varchar
    await sql`
      ALTER TABLE expenses ALTER COLUMN category TYPE varchar(100) USING category::text
    `.catch(() => {});

    // Migrate category_budgets.category from enum to varchar
    await sql`
      ALTER TABLE category_budgets ALTER COLUMN category TYPE varchar(100) USING category::text
    `.catch(() => {});

    console.log("[db-migrate] Schema OK");
  } catch (err) {
    console.error("[db-migrate] Falha ao aplicar schema:", err);
    throw err;
  } finally {
    await sql.end();
  }
}
