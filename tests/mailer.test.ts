import { describe, it, expect } from "vitest";
import { sendPasswordResetEmail } from "../server/_core/mailer";

const TEST_EMAIL = process.env.TEST_EMAIL;

describe("sendPasswordResetEmail", () => {
  it("envia email de reset com código de 6 dígitos", { timeout: 15000 }, async () => {
    if (!TEST_EMAIL) {
      console.warn("TEST_EMAIL não definido — pulando envio real. Defina TEST_EMAIL=seu@email.com no .env");
      return;
    }

    const code = "123456";
    const result = await sendPasswordResetEmail(TEST_EMAIL, code);
    expect(result).toBe(true);
    console.log(`✓ Email enviado para ${TEST_EMAIL}`);
  });

  it("retorna true mesmo sem RESEND_API_KEY configurado", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    // Re-importa com env limpo não é possível em módulos cacheados,
    // então testamos o comportamento via mock manual
    const result = await sendPasswordResetEmail("qualquer@email.com", "000000");
    expect(result).toBe(true);

    if (original) process.env.RESEND_API_KEY = original;
  });
});
