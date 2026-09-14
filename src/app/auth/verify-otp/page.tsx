import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyOtpForm from "./verify-otp-form";

export const metadata: Metadata = {
  title: "Verifikasi Akun",
};

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}