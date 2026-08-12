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