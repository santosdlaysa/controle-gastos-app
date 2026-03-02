/**
 * Script de migração customizado.
 * Usa nossa própria conexão postgres (com SSL correto para Render)
 * em vez do drizzle-kit push que não passa o SSL corretamente.
 *
 * Uso: pnpm db:push
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL não definido no .env");
  process.exit(1);
}

const sql = postgres(url, { ssl: { rejectUnauthorized: false }, onnotice: () => {} });

async function push() {
  console.log("🔌 Conectando ao banco...");

  // Verifica conexão
  await sql`SELECT 1`;
  console.log("✅ Conectado!\n");

  console.log("📦 Criando enums...");

  await sql`
    DO $$ BEGIN
      CREATE TYPE "role" AS ENUM ('user', 'admin');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE "expense_category" AS ENUM (
        'transporte', 'alimentacao', 'moradia',
        'saude', 'educacao', 'lazer', 'outro'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE "expense_source" AS ENUM ('manual', 'pluggy', 'nubank');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("📋 Criando tabelas...");

  await sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id"            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "openId"        VARCHAR(64)  NOT NULL UNIQUE,
      "name"          TEXT,
      "email"         VARCHAR(320),
      "loginMethod"   VARCHAR(64),
      "passwordHash"  VARCHAR(255),
      "role"          "role"       NOT NULL DEFAULT 'user',
      "createdAt"     TIMESTAMP    NOT NULL DEFAULT NOW(),
      "updatedAt"     TIMESTAMP    NOT NULL DEFAULT NOW(),
      "lastSignedIn"  TIMESTAMP    NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id"         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "userId"     INTEGER        NOT NULL,
      "clientId"   VARCHAR(128),
      "name"       VARCHAR(255)   NOT NULL,
      "category"   "expense_category" NOT NULL,
      "value"      NUMERIC(10,2)  NOT NULL,
      "date"       VARCHAR(30)    NOT NULL,
      "month"      VARCHAR(7)     NOT NULL,
      "quantity"   VARCHAR(20),
      "paid"       BOOLEAN        DEFAULT FALSE,
      "source"     "expense_source" DEFAULT 'manual',
      "createdAt"  TIMESTAMP      NOT NULL DEFAULT NOW(),
      "updatedAt"  TIMESTAMP      NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "expenses_user_client_idx"
    ON "expenses" ("userId", "clientId")
    WHERE "clientId" IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "incomes" (
      "id"         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "userId"     INTEGER        NOT NULL UNIQUE,
      "salary"     NUMERIC(10,2)  DEFAULT 0,
      "vale"       NUMERIC(10,2)  DEFAULT 0,
      "other"      NUMERIC(10,2)  DEFAULT 0,
      "updatedAt"  TIMESTAMP      NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "budgets" (
      "id"           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "userId"       INTEGER       NOT NULL,
      "month"        VARCHAR(7)    NOT NULL,
      "totalBudget"  NUMERIC(10,2) DEFAULT 0,
      "updatedAt"    TIMESTAMP     NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "budgets_user_month_idx"
    ON "budgets" ("userId", "month")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "category_budgets" (
      "id"        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      "userId"    INTEGER            NOT NULL,
      "month"     VARCHAR(7)         NOT NULL,
      "category"  "expense_category" NOT NULL,
      "amount"    NUMERIC(10,2)      NOT NULL,
      "updatedAt" TIMESTAMP          NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "cat_budgets_user_month_cat_idx"
    ON "category_budgets" ("userId", "month", "category")
  `;

  console.log("\n✅ Schema aplicado com sucesso!");
  await sql.end();
}

push().catch((err) => {
  console.error("❌ Erro na migração:", err.message);
  sql.end();
  process.exit(1);
});
