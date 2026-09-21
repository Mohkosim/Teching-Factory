import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getProvider(): "smtp" | "resend" {
  const explicit = process.env.MAIL_PROVIDER?.toLowerCase();
  if (explicit === "smtp" || explicit === "resend") return explicit;
  return process.env.SMTP_USER && process.env.SMTP_PASS ? "smtp" : "resend";
}

function getFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM belum diisi di environment variable");
  }
  return from;
}

let smtpTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) return smtpTransporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER dan SMTP_PASS belum diisi di environment variable");
  }

  const port = Number(process.env.SMTP_PORT ?? 465);

  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return smtpTransporter;
}

async function sendViaSmtp({ to, subject, html, text }: MailPayload) {
  await getSmtpTransporter().sendMail({
    from: getFrom(),
    to,
    subject,
    html,
    text,
  });
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY belum diisi di environment variable");
  }
  resendClient = new Resend(key);
  return resendClient;
}

async function sendViaResend({ to, subject, html, text }: MailPayload) {
  const { error } = await getResend().emails.send({
    from: getFrom(),
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function sendMail(payload: MailPayload) {
  if (getProvider() === "smtp") {
    await sendViaSmtp(payload);
  } else {
    await sendViaResend(payload);
  }
}

export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  await sendMail({
    to,
    subject: "Reset Kata Sandi - Teaching Factory",
    text: [
      "Reset Kata Sandi",
      "",
      "Kami menerima permintaan untuk mereset kata sandi akun Teaching Factory Anda.",
      "Buka link berikut untuk membuat kata sandi baru (berlaku 30 menit):",
      resetUrl,
      "",
      "Jika Anda tidak meminta reset kata sandi, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Reset Kata Sandi</h2>
        <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Klik tombol di bawah untuk membuat kata sandi baru:</p>
        <a href="${resetUrl}" style="display:inline-block; background:#38bdf8; color:#fff; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:bold; margin:16px 0;">
          Reset Kata Sandi
        </a>
        <p>Link ini hanya berlaku selama <b>30 menit</b>. Jika Anda tidak meminta reset kata sandi, abaikan email ini.</p>
        <p style="color:#888; font-size:12px;">Atau salin link berikut ke browser Anda:<br/>${resetUrl}</p>
      </div>
    `,
  });
}

export async function sendOtpEmail(to: string, otp: string) {
  await sendMail({
    to,
    subject: "Kode Verifikasi Akun - Teaching Factory",
    text: [
      "Verifikasi Akun Anda",
      "",
      `Kode verifikasi Teaching Factory Anda: ${otp}`,
      "",
      "Kode ini berlaku selama 10 menit. Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai admin Teaching Factory.",
      "",
      "Jika Anda tidak merasa mendaftar/meminta kode ini, abaikan email ini.",
    ].join("\n"),
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Verifikasi Akun Anda</h2>
        <p>Gunakan kode berikut untuk memverifikasi akun Teaching Factory Anda:</p>
        <div style="background:#f0f9ff; border-radius:12px; padding:16px 24px; text-align:center; margin:16px 0;">
          <span style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#0ea5e9;">${otp}</span>
        </div>
        <p>Kode ini hanya berlaku selama <b>10 menit</b>. Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai admin Teaching Factory.</p>
        <p style="color:#888; font-size:12px;">Jika Anda tidak merasa mendaftar/meminta kode ini, abaikan email ini.</p>
      </div>
    `,
  });
}
