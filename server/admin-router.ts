import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb, runRawSql } from "./db";
import { sql } from "drizzle-orm";

export const adminRouter = router({
  getTables: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return (result as any[]).map((r: any) => r.table_name as string);
  }),

  getTableData: protectedProcedure
    .input(z.object({ table: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.execute(sql.raw(`SELECT * FROM "${input.table}" LIMIT 100`));
      return result as any[];
    }),

  executeSQL: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      try {
        const result = await db.execute(sql.raw(input.query));
        return { rows: result as any[], error: null };
      } catch (err) {
        return { rows: [], error: err instanceof Error ? err.message : String(err) };
      }
    }),
});
