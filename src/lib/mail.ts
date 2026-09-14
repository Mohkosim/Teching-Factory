import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendResetPasswordEmail(to: string, resetUrl: string) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject: "Reset Kata Sandi - Teaching Factory",
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

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendOtpEmail(to: string, otp: string) {
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject: "Kode Verifikasi Akun - Teaching Factory",
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

  if (error) {
    throw new Error(error.message);
  }
}