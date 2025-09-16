// packages/main/src/lib/mailer.ts
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM } =
  process.env;

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (transporter) return transporter;

  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_SECURE ?? "false").toLowerCase() === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

/** Envia e-mail de reset. Se SMTP não estiver configurado, loga o link no console. */
export async function sendResetEmail(to: string, resetLink: string) {
  const t = getTransport();
  const from = MAIL_FROM || "Kogma <no-reply@kogma.local>";

  const subject = "Cadastrar nova senha";
  const text = `Para cadastrar uma nova senha, acesse: ${resetLink}\n\nSe você não solicitou, ignore este e-mail.`;
  const html = `
  <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.5; color:#111; max-width:560px">
    <h2 style="margin:0 0 12px">Cadastrar nova senha</h2>
    <p>Recebemos uma solicitação para cadastrar uma nova senha.</p>
    <p>Clique no botão abaixo para continuar:</p>
    <p style="margin:20px 0">
      <a href="${resetLink}" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#2563eb;color:#fff;text-decoration:none">
        Cadastrar nova senha
      </a>
    </p>
    <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
    <p style="word-break:break-all"><a href="${resetLink}">${resetLink}</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
    <p style="color:#555;font-size:13px">Se você não solicitou, pode ignorar esta mensagem.</p>
  </div>`.trim();

  if (!t) {
    console.log(
      "[mailer] SMTP não configurado. Link de reset:",
      resetLink,
      "-> destinatário:",
      to
    );
    return;
  }

  await t.sendMail({ from, to, subject, text, html });
}
