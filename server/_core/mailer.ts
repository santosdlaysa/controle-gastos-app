import { Resend } from "resend";
import { ENV } from "./env";

function getResend() {
  if (!ENV.resendApiKey) return null;
  return new Resend(ENV.resendApiKey);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.log(`[Mailer] RESEND_API_KEY não configurado. Código de reset para ${to}: ${code}`);
    return true;
  }

  await resend.emails.send({
    from: ENV.resendFrom,
    to,
    subject: "Redefinição de senha — Orgenyx",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;">
        <h2 style="color:#0a7ea4;margin-bottom:8px;">Redefinição de senha</h2>
        <p style="color:#555;margin-bottom:24px;">Use o código abaixo no aplicativo Orgenyx:</p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:24px;text-align:center;">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#0a7ea4;">${code}</span>
        </div>
        <p style="color:#999;font-size:13px;margin-top:24px;">Expira em 15 minutos. Se não foi você, ignore este email.</p>
      </div>
    `,
  });
  return true;
}
