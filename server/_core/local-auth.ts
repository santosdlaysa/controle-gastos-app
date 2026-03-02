import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import { getDb } from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

// ─── Password utilities ───────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else {
        try {
          resolve(timingSafeEqual(derived, Buffer.from(hash, "hex")));
        } catch {
          resolve(false);
        }
      }
    });
  });
}

// ─── Response builder ─────────────────────────────────────────────────────────

function buildUserResponse(user: {
  id?: number | null;
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date | null;
}) {
  return {
    id: user.id ?? null,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: (user.lastSignedIn ?? new Date()).toISOString(),
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export function registerLocalAuthRoutes(app: Express) {
  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Email inválido." });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Senha deve ter no mínimo 8 caracteres." });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Banco de dados não disponível." });
      return;
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const openId = `email:${normalizedEmail}`;

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: "Este email já está cadastrado." });
        return;
      }

      const passwordHash = await hashPassword(password);

      await db.insert(users).values({
        openId,
        email: normalizedEmail,
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.openId, openId))
        .limit(1);

      const token = await sdk.signSession(
        { openId, appId: ENV.appId || "local", name: user.name ?? "" },
        { expiresInMs: ONE_YEAR_MS },
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.status(201).json({ token, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[LocalAuth] Register failed:", error);
      res.status(500).json({ error: "Erro ao criar conta." });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "Email e senha são obrigatórios." });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({ error: "Banco de dados não disponível." });
      return;
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Email ou senha incorretos." });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Email ou senha incorretos." });
        return;
      }

      await db
        .update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.openId, user.openId));

      const token = await sdk.signSession(
        { openId: user.openId, appId: ENV.appId || "local", name: user.name ?? "" },
        { expiresInMs: ONE_YEAR_MS },
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ token, user: buildUserResponse(user) });
    } catch (error) {
      console.error("[LocalAuth] Login failed:", error);
      res.status(500).json({ error: "Erro ao fazer login." });
    }
  });
}
