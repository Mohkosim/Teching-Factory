"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { tampilkanLoading } from "@/lib/utils/alert";
import { getRoleRedirect } from "@/lib/utils/role-redirect";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import Link from "next/link";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!email) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          Halaman Tidak Valid
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Silakan daftar ulang untuk mendapatkan kode verifikasi.
        </p>
        <Link
          href="/auth/register"
          className="inline-block mt-4 font-bold text-sky-500 hover:text-sky-600 transition-colors text-sm"
        >
          Kembali ke Pendaftaran
        </Link>
      </div>
    );
  }

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error("Kode OTP harus 6 digit");
      return;
    }

    setIsVerifying(true);
    tampilkanLoading("Memverifikasi...");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const result = await res.json();

      if (!res.ok) {
        Swal.close();
        toast.error("Verifikasi gagal", { description: result.message });
        return;
      }

      const goToLogin = () => {
        Swal.close();
        toast.success("Akun berhasil diverifikasi!", {
          description: "Silakan masuk menggunakan akun Anda.",
          duration: 1500,
          onAutoClose: () => {
            router.replace("/auth/login");
          },
        });
      };

      if (!result.loginTicket) {
        goToLogin();
        return;
      }

      const loginResult = await signIn("otp-ticket", {
        ticket: result.loginTicket,
        redirect: false,
      });

      if (loginResult?.error) {
        goToLogin();
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const target = getRoleRedirect(session?.user?.role);

      Swal.close();
      toast.success("Akun berhasil diverifikasi!", {
        description: "Selamat datang di Teaching Factory.",
        duration: 1200,
        onAutoClose: () => {
          router.replace(target);
        },
      });
    } catch (error) {
      Swal.close();
      console.error(error);
      toast.error("Terjadi kesalahan server");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    tampilkanLoading("Mengirim ulang kode...");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      Swal.close();

      if (!res.ok) {
        toast.error("Gagal mengirim ulang", { description: result.message });
        return;
      }

      toast.success("Kode OTP baru sudah dikirim", {
        description:
          typeof result.remainingToday === "number"
            ? `Sisa permintaan kode hari ini: ${result.remainingToday}x`
            : undefined,
      });
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      Swal.close();
      console.error(error);
      toast.error("Terjadi kesalahan server");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-14 h-14 rounded-2xl bg-sky-100 flex items-center justify-center">
        <MailCheck className="w-6 h-6 text-sky-500" />
      </div>

      <div className="w-full">
        <h1 className="text-xl font-black text-gray-900 tracking-tight">
          Verifikasi Akun
        </h1>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Kami telah mengirim kode verifikasi 6 digit ke [{email}]. Masukkan
          kode tersebut untuk mengaktifkan akun Anda.
        </p>

        <div className="mt-5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full bg-sky-50 border-0 rounded-xl h-14 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder:text-gray-300 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          />

          <Button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || otp.length !== 6}
            className="w-full h-12 rounded-xl bg-sky-400 hover:bg-sky-500 text-white font-bold text-sm shadow-sm transition-colors duration-200 mt-4 disabled:opacity-60"
          >
            {isVerifying ? "Memverifikasi..." : "Verifikasi"}
          </Button>
        </div>

        <div className="mt-5 space-y-2 text-xs">
          <p className="text-gray-700 font-semibold">
            Tidak menerima kode?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="font-bold text-sky-500 hover:text-sky-600 transition-colors disabled:opacity-60 disabled:text-gray-400"
            >
              {cooldown > 0 ? `Kirim Ulang (${cooldown}d)` : isResending ? "Mengirim..." : "Kirim Ulang"}
            </button>
          </p>
          <p className="text-gray-400 leading-relaxed">
            Email belum masuk? Cek juga folder <b>Spam</b>. Kode baru bisa diminta
            maksimal 3 kali per hari.
          </p>
        </div>
      </div>
    </div>
  );
}