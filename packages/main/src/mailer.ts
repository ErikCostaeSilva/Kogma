import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let cached: Transporter | null = null;

export async function getMailer(): Promise<Transporter> {
  if (cached) return cached;

  const mode = String(process.env.MAIL_MODE || "console");

  if (mode === "smtp") {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE) === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return cached;
  }

  if (mode === "ethereal") {
    const test = await nodemailer.createTestAccount();
    cached = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user: test.user, pass: test.pass }
    });
    console.log("Ethereal user:", test.user);
    console.log("Ethereal pass:", test.pass);
    return cached;
  }

  cached = nodemailer.createTransport({ streamTransport: true, newline: "unix", buffer: true } as any);
  return cached;
}

export async function sendResetEmail(to: string, link: string) {
  const transporter = await getMailer();
  const info = await transporter.sendMail({
    from: `"KOGMA" <${process.env.SMTP_USER || "no-reply@kogma.local"}>`,
    to,
    subject: "Redefinir senha",
    text: `Para redefinir sua senha, acesse: ${link}`,
    html: `<p>Para redefinir sua senha, <a href="${link}">clique aqui</a>.</p>`
  });

  const preview = (nodemailer as any).getTestMessageUrl?.(info);
  if (preview) console.log("📨 Preview URL (Ethereal):", preview);
  console.log("📩 MessageId:", (info as any).messageId);
}
