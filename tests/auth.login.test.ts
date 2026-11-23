import { randomBytes, scryptSync } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const dbState = {
  available: true,
  selectRows: [] as unknown[],
  selectError: null as Error | null,
  updates: [] as unknown[],
};

function createFakeDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            if (dbState.selectError) throw dbState.selectError;
            return dbState.selectRows;
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          dbState.updates.push(values);
        },
      }),
    }),
  };
}

vi.mock("../server/db", () => ({
  getDb: async () => (dbState.available ? createFakeDb() : null),
}));

const signSession = vi.fn(async () => "fake-jwt-token");
vi.mock("../server/_core/sdk", () => ({
  sdk: { signSession: (...args: unknown[]) => signSession(...(args as [])) },
}));

vi.mock("../server/_core/mailer", () => ({
  sendPasswordResetEmail: vi.fn(async () => true),
}));

// Importa depois dos mocks
const { registerLocalAuthRoutes } = await import("../server/_core/local-auth");

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Handler = (req: any, res: any) => Promise<void>;

function getLoginHandler(): Handler {
  const routes = new Map<string, Handler>();
  const fakeApp = {
    post: (path: string, handler: Handler) => routes.set(path, handler),
  };
  registerLocalAuthRoutes(fakeApp as any);
  const handler = routes.get("/api/auth/login");
  if (!handler) throw new Error("Rota /api/auth/login não registrada");
  return handler;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function createReq(body: unknown) {
  return {
    body,
    protocol: "http",
    hostname: "localhost",
    headers: {},
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    body: undefined as any,
    cookies: [] as { name: string; value: string; options: Record<string, unknown> }[],
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
    cookie(name: string, value: string, options: Record<string, unknown>) {
      res.cookies.push({ name, value, options });
      return res;
    },
  };
  return res;
}

const PASSWORD = "senha-segura-123";
const storedUser = {
  id: 42,
  openId: "email:fulano@example.com",
  name: "Fulano",
  email: "fulano@example.com",
  passwordHash: hashPassword(PASSWORD),
  loginMethod: "email",
  lastSignedIn: new Date("2026-01-01T00:00:00Z"),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  const login = getLoginHandler();

  beforeEach(() => {
    dbState.available = true;
    dbState.selectRows = [storedUser];
    dbState.selectError = null;
    dbState.updates = [];
    signSession.mockClear();
  });

  it("autentica com credenciais válidas, retorna token e define cookie", async () => {
    const res = createRes();
    await login(createReq({ email: "  Fulano@Example.com ", password: PASSWORD }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBe("fake-jwt-token");
    expect(res.body.user).toMatchObject({
      id: 42,
      openId: storedUser.openId,
      email: storedUser.email,
      name: "Fulano",
      loginMethod: "email",
    });
    expect(res.body.user).not.toHaveProperty("passwordHash");

    expect(signSession).toHaveBeenCalledTimes(1);
    expect(signSession.mock.calls[0]?.[0]).toMatchObject({ openId: storedUser.openId });

    expect(res.cookies).toHaveLength(1);
    expect(res.cookies[0]).toMatchObject({
      name: COOKIE_NAME,
      value: "fake-jwt-token",
      options: { httpOnly: true, path: "/", sameSite: "lax", secure: false },
    });

    // Atualiza lastSignedIn
    expect(dbState.updates).toHaveLength(1);
    expect((dbState.updates[0] as any).lastSignedIn).toBeInstanceOf(Date);
  });

  it("retorna 401 com senha incorreta", async () => {
    const res = createRes();
    await login(createReq({ email: storedUser.email, password: "senha-errada" }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Email ou senha incorretos." });
    expect(res.cookies).toHaveLength(0);
    expect(signSession).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o usuário não existe (mesma mensagem, sem enumeração)", async () => {
    dbState.selectRows = [];
    const res = createRes();
    await login(createReq({ email: "ninguem@example.com", password: PASSWORD }), res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Email ou senha incorretos." });
  });

  it("retorna 401 para usuário sem senha (conta OAuth)", async () => {
    dbState.selectRows = [{ ...storedUser, passwordHash: null }];
    const res = createRes();
    await login(createReq({ email: storedUser.email, password: PASSWORD }), res);

    expect(res.statusCode).toBe(401);
  });

  it.each([
    [{}],
    [{ email: "fulano@example.com" }],
    [{ password: PASSWORD }],
    [undefined],
  ])("retorna 400 quando faltam campos: %j", async (body) => {
    const res = createRes();
    await login(createReq(body), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Email e senha são obrigatórios." });
  });

  it("retorna 500 quando o banco não está disponível", async () => {
    dbState.available = false;
    const res = createRes();
    await login(createReq({ email: storedUser.email, password: PASSWORD }), res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Banco de dados não disponível." });
  });

  it("retorna 500 quando a consulta falha", async () => {
    dbState.selectError = new Error("boom");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = createRes();
    await login(createReq({ email: storedUser.email, password: PASSWORD }), res);
    spy.mockRestore();

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao fazer login." });
  });
});
